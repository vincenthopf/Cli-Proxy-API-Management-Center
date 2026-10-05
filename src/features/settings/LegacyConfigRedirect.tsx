import { Navigate, useLocation } from 'react-router-dom';
import { legacyConfigTarget } from './settingsLayout';

export function LegacyConfigRedirect() {
  const location = useLocation();
  return <Navigate to={legacyConfigTarget(location.search)} replace />;
}
