import pytest

from app.services.url_guard import UnsafeUrlError, check_host_resolves_public, check_url_shape

CALLBACK = "https://example.com/lnurlp/callback"
ADDRESS = "alice@example.com"


@pytest.mark.parametrize(
    "verify_url",
    [
        "https://example.com/verify/abc",
        "https://example.com:8443/verify/abc",
        "https://pay.example.com/verify/abc",
        "https://EXAMPLE.COM/verify/abc",
        "https://example.com./verify/abc",
    ],
)
def test_shape_accepts_same_site(verify_url):
    check_url_shape(verify_url, CALLBACK, ADDRESS)


def test_shape_accepts_callback_domain_differing_from_address_domain():
    # Some wallets host the address on one domain and the callback on another.
    check_url_shape(
        "https://wallet.example.net/verify/abc",
        "https://wallet.example.net/lnurlp/callback",
        "alice@example.com",
    )


@pytest.mark.parametrize(
    "verify_url",
    [
        "http://example.com/verify/abc",  # not https
        "ftp://example.com/verify/abc",
        "file:///etc/passwd",
        "https://evil.com/verify/abc",  # off-site
        "https://example.com.evil.com/verify/abc",  # suffix trickery
        "https://notexample.com/verify/abc",
        "https://169.254.169.254/latest/meta-data",
        "https://127.0.0.1/verify/abc",
        "https:///verify/abc",  # no host
    ],
)
def test_shape_rejects(verify_url):
    with pytest.raises(UnsafeUrlError):
        check_url_shape(verify_url, CALLBACK, ADDRESS)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "host",
    ["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "169.254.169.254", "0.0.0.0", "::1"],
)
async def test_resolve_rejects_non_public_ip_literals(host):
    with pytest.raises(UnsafeUrlError):
        await check_host_resolves_public(host)


@pytest.mark.asyncio
async def test_resolve_accepts_public_ip_literal():
    await check_host_resolves_public("1.1.1.1")


@pytest.mark.asyncio
async def test_resolve_rejects_host_resolving_to_private_address(monkeypatch):
    async def fake_getaddrinfo(host, port, **kwargs):
        return [(2, 1, 6, "", ("192.168.0.5", 443))]

    import asyncio

    loop = asyncio.get_running_loop()
    monkeypatch.setattr(loop, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(UnsafeUrlError, match="non-public"):
        await check_host_resolves_public("rebind.example.com")


@pytest.mark.asyncio
async def test_resolve_accepts_host_resolving_to_public_address(monkeypatch):
    async def fake_getaddrinfo(host, port, **kwargs):
        return [(2, 1, 6, "", ("93.184.216.34", 443))]

    import asyncio

    loop = asyncio.get_running_loop()
    monkeypatch.setattr(loop, "getaddrinfo", fake_getaddrinfo)

    await check_host_resolves_public("example.com")


@pytest.mark.asyncio
async def test_resolve_rejects_unresolvable_host(monkeypatch):
    import asyncio
    import socket

    async def fake_getaddrinfo(host, port, **kwargs):
        raise socket.gaierror("nope")

    loop = asyncio.get_running_loop()
    monkeypatch.setattr(loop, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(UnsafeUrlError):
        await check_host_resolves_public("nx.example.com")
