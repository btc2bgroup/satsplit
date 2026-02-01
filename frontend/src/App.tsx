import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CreateBill from "./pages/CreateBill";
import ViewBill from "./pages/ViewBill";
import About from "./pages/About";
import Stats from "./pages/Stats";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CreateBill />} />
        <Route path="/bill/:shortCode" element={<ViewBill />} />
        <Route path="/about" element={<About />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
