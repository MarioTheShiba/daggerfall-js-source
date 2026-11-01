import { useEffect, useState, type JSX } from 'react'
import type { AppInfo, FolderKind, KaraOpsSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { Hunter } from './hunter/Hunter'
import { Orrery } from './orrery/Orrery'

type Page = 'dashboard' | 'dungeons' | 'dragons' | 'map' | 'orrery' | 'settings'
type ModulePage = Exclude<Page, 'dashboard' | 'settings'>

type NavItem = { page: Page; label: string; icon: string }
const navItems: NavItem[] = [
  { page: 'dashboard', label: 'Overview', icon: '◈' },
  { page: 'dungeons', label: 'Dungeon Hunter', icon: '⌖' },
  { page: 'dragons', label: 'Dragon Radar', icon: '♜' },
  { page: 'map', label: 'World Atlas', icon: '◇' },
  { page: 'orrery', label: 'Orrery Solver', icon: '◷' },
  { page: 'settings', label: 'Settings', icon: '⚙' }
]

const modules: { page: ModulePage; title: string; description: string; icon: string; phase: string }[] = [
  { page: 'dungeons', title: 'Dungeon Hunter', description: 'Find predicted enemies in bounded searches across Tamriel theatres.', icon: '⌖', phase: 'TAMRIEL / BOUNDED' },
  { page: 'dragons', title: 'Dragon Radar', description: 'Reserved for integration of the existing proven locator.', icon: '♜', phase: 'NOT CONNECTED' },
  { page: 'map', title: 'World Atlas', description: 'A shared map for candidate locations, towns, and routes.', icon: '◇', phase: 'PLANNED' },
  { page: 'orrery', title: 'Orrery Solver', description: 'Detect Shattered Hour slot IDs through the local DevTools interface and guide clock turns.', icon: '◷', phase: 'OPTIONAL / READ ONLY' }
]

function App(): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<KaraOpsSettings>(DEFAULT_SETTINGS)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [busy, setBusy] = useState<FolderKind | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([window.karaops.getSettings(), window.karaops.getAppInfo()])
      .then(([saved, appInfo]) => {
        if (!active) return
        setSettings(saved)
        setInfo(appInfo)
      })
      .catch((error: unknown) => {
        if (active) setNotice(`Could not load application settings: ${String(error)}`)
      })
    return () => { active = false }
  }, [])

  async function pickFolder(kind: FolderKind): Promise<void> {
    setBusy(kind)
    setNotice('')
    try {
      const dir = await window.karaops.chooseFolder(kind)
      if (!dir) return
      const next = { ...settings, [kind === 'arena2' ? 'arena2Path' : 'dfoSourcePath']: dir }
      const saved = await window.karaops.saveSettings(next)
      setSettings(saved)
      setNotice('Folder saved locally.')
    } catch (error) {
      setNotice(`Could not save the folder: ${String(error)}`)
    } finally {
      setBusy(null)
    }
  }

  const configured = !!settings.arena2Path && !!settings.dfoSourcePath
  const selectedModule = modules.find((m) => m.page === page && m.page !== 'dungeons' && m.page !== 'orrery')

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">K</div>
        <div><strong>KARAOPS</strong><span>DFO INTELLIGENCE</span></div>
      </div>
      <div className="side-label">COMMAND CENTER</div>
      <nav aria-label="Main navigation">
        {navItems.map((item) => <button key={item.page} type="button" className={`nav-button ${page === item.page ? 'active' : ''}`} onClick={() => { setNotice(''); setPage(item.page) }}>
          <span className="nav-icon">{item.icon}</span>{item.label}
        </button>)}
      </nav>
      <div className="side-bottom">
        <span className="small-kicker">BUILD STATUS</span>
        <div className="version-line"><span className="status-dot" /> KaraOps v{info?.version ?? '0.1.0'}</div>
        <div className="side-muted">No game connections active.</div>
        <div className="side-muted">{info?.mode === 'portable' ? 'PORTABLE MODE' : 'DEVELOPMENT MODE'}</div>
      </div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div className="breadcrumb">KARAOPS <span>/</span> {navItems.find(x => x.page === page)?.label.toUpperCase()}</div>
        <div className="top-status"><span className="status-dot amber" /> OFFLINE · READ ONLY</div>
      </header>
      <div className="page-scroll">
        {page === 'dashboard' && <>
          <div className="eyebrow">THE INTELLIGENCE SUITE</div>
          <h1>Your command center,<br/><em>built for Tamriel.</em></h1>
          <p className="lead">KaraOps is a standalone, portable companion for Daggerfall Online. Search generated dungeons across Tamriel using your local source and game data, with floor maps and bounded walking analysis. Live availability is unverified.</p>
          <div className="stat-strip">
            <div><span>APPLICATION</span><strong>{info?.version ?? '0.5.0'}</strong><small>Hunter / source-derived</small></div>
            <div><span>HUNTER</span><strong>TAMRIEL</strong><small>Bounded coverage</small></div>
            <div><span>GAME CONNECTION</span><strong>OFF</strong><small>Read-only design</small></div>
          </div>
          <div className="section-head"><h2>Modules</h2><span>Choose a destination</span></div>
          <div className="module-grid">
            {modules.map(m => <button key={m.page} type="button" className="module-card" onClick={() => setPage(m.page)}>
              <div className="module-top"><div className="module-symbol">{m.icon}</div><span className="phase-label">{m.phase}</span></div>
              <h3>{m.title}</h3><p>{m.description}</p><span className="module-open">OPEN MODULE <span>→</span></span>
            </button>)}
          </div>
          <div className="hint"><span className="hint-symbol">✦</span><div><strong>{configured ? 'Paths configured' : 'Complete initial configuration'}</strong><p>{configured ? 'Open Dungeon Hunter to validate data and start a bounded offline scan.' : 'Visit Settings to choose your ARENA2 directory and local DFO source folder.'}</p></div><button type="button" onClick={() => setPage('settings')}>SETTINGS →</button></div>
        </>}

        {page === 'dungeons' && <Hunter/>}
        {page === 'orrery' && <Orrery/>}
        {selectedModule && <>
          <div className="eyebrow">MODULE / {selectedModule.phase}</div>
          <h1>{selectedModule.title}</h1>
          <p className="lead">{selectedModule.description}</p>
          <div className="empty-module"><div className="empty-emblem">{selectedModule.icon}</div><h2>Reserved for the next build</h2><p>This is a real navigation page, but the underlying feature is deliberately not wired yet. No network traffic, game modification, or background monitoring occurs.</p><div className="empty-tag">STATUS · NOT IMPLEMENTED</div></div>
          <div className="module-back"><button onClick={() => setPage('dashboard')} type="button">← BACK TO OVERVIEW</button></div>
        </>}

        {page === 'settings' && <>
          <div className="eyebrow">PREFERENCES / ON THIS DEVICE</div>
          <h1>Application settings</h1>
          <p className="lead">Choose local folders once. Dungeon Hunter reads the selected DFO algorithms and ARENA2 data when you validate or scan. Game files remain read-only.</p>
          <div className="settings-box">
            <div className="setting-row"><div><h3>ARENA2 data directory</h3><p>The original Daggerfall game data (not bundled with KaraOps).</p><div className="path-field" title={settings.arena2Path}>{settings.arena2Path || 'Not configured'}</div></div><button disabled={busy !== null} onClick={() => void pickFolder('arena2')} type="button">{busy === 'arena2' ? 'CHOOSING...' : 'BROWSE'}</button></div>
            <div className="setting-row"><div><h3>DFO source directory</h3><p>Trusted local <code>daggerfall-js-source</code> checkout; Hunter imports its generation modules read-only.</p><div className="path-field" title={settings.dfoSourcePath}>{settings.dfoSourcePath || 'Not configured'}</div></div><button disabled={busy !== null} onClick={() => void pickFolder('source')} type="button">{busy === 'source' ? 'CHOOSING...' : 'BROWSE'}</button></div>
          </div>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="storage-note"><strong>Local storage</strong><div>{info?.dataDir ?? 'Loading...'}</div><p>In the portable EXE, this folder sits beside KaraOps.exe as <code>KaraOpsData</code>.</p></div>
        </>}
      </div>
      <footer className="footer"><span>LOCAL FIRST · NO AUTOMATED GAMEPLAY</span><span>v{info?.version ?? '0.1.0'} · FOUNDATION BUILD</span></footer>
    </main>
  </div>
}

export default App
