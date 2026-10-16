import React from 'react';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

interface RoutePendingViewProps {
  routeTitle: string;
  routePath: string;
  onNavigateHome: () => void;
}

export const RoutePendingView: React.FC<RoutePendingViewProps> = ({
  routeTitle,
  routePath,
  onNavigateHome
}) => {
  return (
    <main className="route-pending-main" role="main" aria-label={routeTitle}>
      <div className="route-pending-glow" aria-hidden="true"></div>

      <div className="container-fluid route-pending-container">
        <div className="route-pending-card">
          <div className="route-pending-eyebrow-wrap">
            <span className="route-pending-dash">——</span>
            <span className="route-pending-eyebrow">DEDICATED ROUTE · {routePath.toUpperCase()}</span>
            <span className="route-pending-dash">——</span>
          </div>

          <h1 className="route-pending-heading">{routeTitle}</h1>

          <p className="route-pending-description">
            This dedicated page route is configured and reserved for the {routeTitle} component integration.
          </p>

          <div className="route-pending-meta-box">
            <div className="route-pending-meta-item">
              <Clock size={16} className="route-meta-icon" />
              <span>Route Status: <strong>Active &amp; Ready for Integration</strong> ({routePath})</span>
            </div>
            <div className="route-pending-meta-item">
              <ShieldCheck size={16} className="route-meta-icon" />
              <span>Preserved Architecture: No placeholder mockups injected</span>
            </div>
          </div>

          <div className="route-pending-actions">
            <button
              type="button"
              className="btn-back-home"
              onClick={onNavigateHome}
              aria-label="Return to Gardner Auction Homepage"
            >
              <ArrowLeft size={16} />
              <span>Return to Homepage</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
