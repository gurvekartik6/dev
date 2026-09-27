import { Routes, Route } from "react-router-dom";

import SiteProvider from "./context/SiteContext";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Protected from "./components/Protected";

import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import Events from "./pages/Events";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import Media from "./pages/Media";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import ContentManager from "./pages/admin/ContentManager";
import EventsManager from "./pages/admin/EventsManager";
import Settings from "./pages/admin/Settings";
import Stats from "./pages/admin/Stats";

import "./styles/global.css";
import "./styles/admin.css";

export default function App() {
  return (
    <SiteProvider>
      <Routes>
        {/* ==================== PUBLIC WEBSITE ==================== */}

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/events" element={<Events />} />
          <Route path="/team" element={<Team />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/media" element={<Media />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* ==================== ADMIN LOGIN ==================== */}

        <Route path="/admin/login" element={<Login />} />

        {/* ==================== PROTECTED ADMIN ==================== */}

        <Route
          path="/admin"
          element={
            <Protected>
              <AdminLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="settings" element={<Settings />} />
          <Route path="home" element={<Settings section="home" />} />
          <Route path="stats" element={<Stats />} />
          <Route path="contact" element={<Settings section="contact" />} />
          <Route path="scene" element={<Settings section="scene" />} />

          <Route
            path="announcements"
            element={<ContentManager type="announcements" />}
          />

          <Route path="events" element={<EventsManager />} />

          <Route
            path="timeline"
            element={<ContentManager type="timeline" />}
          />

          <Route
            path="team"
            element={<ContentManager type="team" />}
          />

          <Route
            path="projects"
            element={<ContentManager type="projects" />}
          />

          <Route
            path="media"
            element={<ContentManager type="media" />}
          />

          <Route
            path="achievements"
            element={<ContentManager type="achievements" />}
          />
        </Route>

        {/* ==================== 404 ==================== */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </SiteProvider>
  );
}
