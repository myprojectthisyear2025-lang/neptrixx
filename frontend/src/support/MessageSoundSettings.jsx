/** This-device sound preference and a user-triggered tone preview. */
import { useSupport } from './SupportContext';
export default function MessageSoundSettings() {
  const { soundEnabled, setSoundEnabled, testSound } = useSupport();
  return <div className="sp-sound-settings">
    <label><input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} /> Message sound on this device</label>
    <button onClick={testSound}>Test sound</button>
    <p className="sp-muted">A soft tone plays for incoming messages while this website is focused, after you interact with it. Muted chats stay quiet. Background alerts use your browser and phone sound settings.</p>
  </div>;
}
