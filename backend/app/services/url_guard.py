"""SSRF guard for outbound requests to URLs supplied by third parties.

The LUD-21 `verify` URL comes from a callback response controlled by whoever owns the
lightning address on a bill — i.e. by anyone who can create a bill. Before the backend
makes a server-side request to it we require it to be HTTPS, to live on the same domain
as the LNURL callback, and to resolve to a publicly routable address.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit


class UnsafeUrlError(Exception):
    pass


def _host_of(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return host.rstrip(".")


def _is_same_site(host: str, base_host: str) -> bool:
    """True when host is base_host or a subdomain of it."""
    if not host or not base_host:
        return False
    return host == base_host or host.endswith("." + base_host)


def check_url_shape(verify_url: str, callback_url: str, lightning_address: str) -> None:
    """Validate scheme and host without touching the network."""
    parts = urlsplit(verify_url)
    if parts.scheme != "https":
        raise UnsafeUrlError("verify URL must use https")

    host = _host_of(verify_url)
    if not host:
        raise UnsafeUrlError("verify URL has no host")

    callback_host = _host_of(callback_url)
    address_domain = lightning_address.split("@", 1)[-1].lower().rstrip(".") if "@" in lightning_address else ""

    if not (_is_same_site(host, callback_host) or (address_domain and _is_same_site(host, address_domain))):
        raise UnsafeUrlError(
            f"verify URL host '{host}' is not on the same domain as the LNURL callback"
        )


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


async def check_host_resolves_public(host: str) -> None:
    """Resolve the host and reject loopback / private / link-local / reserved targets."""
    # A bare IP literal never gets a DNS lookup, so check it directly.
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not _is_public_ip(host):
            raise UnsafeUrlError(f"verify URL host '{host}' is not publicly routable")
        return

    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise UnsafeUrlError(f"verify URL host '{host}' could not be resolved: {e}")

    if not infos:
        raise UnsafeUrlError(f"verify URL host '{host}' could not be resolved")

    for info in infos:
        ip = info[4][0]
        if not _is_public_ip(ip):
            raise UnsafeUrlError(f"verify URL host '{host}' resolves to a non-public address")


async def assert_safe_verify_url(verify_url: str, callback_url: str, lightning_address: str) -> None:
    """Full check. Raises UnsafeUrlError if the URL must not be fetched."""
    check_url_shape(verify_url, callback_url, lightning_address)
    await check_host_resolves_public(_host_of(verify_url))
