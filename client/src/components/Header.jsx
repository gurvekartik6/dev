import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react'

export default function Header({ data }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('devsphere-theme') || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('devsphere-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark')

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">DS</span>
          <span className="brand-copy">
            <strong>{data.site.name}</strong>
            <small>{data.site.subtitle}</small>
          </span>
        </Link>

        <button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>

        <nav className={open ? 'open' : ''}>
          {data.navigation.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setOpen(false)}>{item.label}</Link>
          ))}
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <Link className="admin-link" to="/admin/login" onClick={() => setOpen(false)}>
            Admin <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  )
}
