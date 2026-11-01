/** Lazy-loaded support bundle; never mounted while the backend feature switch is off. */
import SupportProvider from './SupportContext';
import SupportPortal from './SupportPortal';
import ChatLauncher from './ChatLauncher';
export default function SupportRuntime({ portal, renderWebsite }) {
  return <SupportProvider>{portal ? <SupportPortal /> : renderWebsite(<ChatLauncher />)}</SupportProvider>;
}
