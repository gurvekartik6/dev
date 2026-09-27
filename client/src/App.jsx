import { Routes, Route } from "react-router-dom";

import SiteProvider from "./context/SiteContext";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import Protected from "./components/Protected";

// Public pages
import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import Events from "./pages/Events";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import Media from "./pages/Media";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Admin pages
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import ContentManager from "./pages/admin/ContentManager";
import EventsManager from "./pages/admin/EventsManager";
import Settings from "./pages/admin/Settings";
import Stats from "./pages/admin/Stats";

// Global styles
import "./styles/global.css";
import "./styles/admin.css";

export default function App() {
  return (
    <SiteProvider>
      <Routes>

        {/* =========================================================
            PUBLIC WEBSITE
        ========================================================= */}

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />

          <Route
            path="/announcements"
            element={<Announcements />}
          />

          <Route
            path="/events"
            element={<Events />}
          />

          <Route
            path="/team"
            element={<Team />}
          />

          <Route
            path="/projects"
            element={<Projects />}
          />

          <Route
            path="/media"
            element={<Media />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />
        </Route>


        {/* =========================================================
            ADMIN LOGIN
            Direct URL:
            /admin/login
        ========================================================= */}

        <Route
          path="/admin/login"
          element={<Login />}
        />


        {/* =========================================================
            PROTECTED ADMIN PANEL
            Direct URL:
            /admin
        ========================================================= */}

        <Route
          path="/admin"
          element={
            <Protected>
              <AdminLayout />
            </Protected>
          }
        >

          {/* Dashboard */}
          <Route
            index
            element={<Dashboard />}
          />

          {/* Site Settings */}
          <Route
            path="settings"
            element={<Settings />}
          />

          {/* Home Content */}
          <Route
            path="home"
            element={<Settings section="home" />}
          />

          {/* Statistics */}
          <Route
            path="stats"
            element={<Stats />}
          />

          {/* Contact */}
          <Route
            path="contact"
            element={<Settings section="contact" />}
          />

          {/* 3D Scene */}
          <Route
            path="scene"
            element={<Settings section="scene" />}
          />

          {/* Announcements */}
          <Route
            path="announcements"
            element={
              <ContentManager type="announcements" />
            }
          />

          {/* Events */}
          <Route
            path="events"
            element={<EventsManager />}
          />

          {/* Timeline */}
          <Route
            path="timeline"
            element={
              <ContentManager type="timeline" />
            }
          />

          {/* Team */}
          <Route
            path="team"
            element={
              <ContentManager type="team" />
            }
          />

          {/* Projects */}
          <Route
            path="projects"
            element={
              <ContentManager type="projects" />
            }
          />

          {/* Media */}
          <Route
            path="media"
            element={
              <ContentManager type="media" />
            }
          />

          {/* Achievements */}
          <Route
            path="achievements"
            element={
              <ContentManager type="achievements" />
            }
          />

        </Route>


        {/* =========================================================
            404 - PAGE NOT FOUND
        ========================================================= */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>
    </SiteProvider>
  );
}
