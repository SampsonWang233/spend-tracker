import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { id: 'add', to: '/add', label: 'Add Expense' },
  { id: 'detail', to: '/detail', label: 'Detail' },
  { id: 'summary', to: '/', label: 'Summary' }
];

export function PageLayout({ title, subtitle, children, variant = 'summary', monthKey }) {
  const location = useLocation();

  const buildLink = (to) => {
    const params = new URLSearchParams(location.search);
    if (monthKey) {
      params.set('month', monthKey);
    } else {
      params.delete('month');
    }
    return {
      pathname: to,
      search: params.toString() ? `?${params.toString()}` : ''
    };
  };

  const containerClass = variant === 'summary' ? 'container summary-page' : 'container details-page';
  const mainClass = variant === 'summary' ? 'summary-layout' : 'details-layout';

  return (
    <div className={containerClass}>
      <header className="primary-header">
        <div className="header-row">
          <h1>{title}</h1>
          <nav className="tab-nav" aria-label="Page navigation">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={buildLink(tab.to)}
                className={({ isActive }) => `tab-link${isActive ? ' tab-active' : ''}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {subtitle ? <p className="header-subtitle">{subtitle}</p> : null}
      </header>

      <main className={mainClass}>{children}</main>
    </div>
  );
}

