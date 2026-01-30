import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CreateBill from "./pages/CreateBill";
import ViewBill from "./pages/ViewBill";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CreateBill />} />
        <Route path="/bill/:shortCode" element={<ViewBill />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
