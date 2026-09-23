import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { logout } from '../lib/api'

export default function AdminSidebar() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('devsphere-theme') || 'dark')
  const items = [
    ['/admin', 'Dashboard'], ['/admin/settings', 'Site Settings'], ['/admin/home', 'Home'],
    ['/admin/stats', 'Statistics'], ['/admin/announcements', 'Announcements'], ['/admin/events', 'Events'],
    ['/admin/timeline', 'Timeline'], ['/admin/team', 'Core Team'], ['/admin/projects', 'Projects'],
    ['/admin/media', 'Media'], ['/admin/achievements', 'Achievements'], ['/admin/contact', 'Contact'], ['/admin/scene', '3D Scene']
  ]

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('devsphere-theme', theme)
  }, [theme])

  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">DEVSPHERE <small>CMS</small></div>
      {items.map(([to, label]) => <NavLink end={to === '/admin'} key={to} to={to}>{label}</NavLink>)}
      <button className="admin-theme" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button className="admin-logout" onClick={() => { logout().finally(() => navigate('/admin/login')) }}>
        <LogOut size={15} /> Log out
      </button>
    </aside>
  )
}
