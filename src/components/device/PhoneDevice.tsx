import { forwardRef } from 'react';
import { Keyboard } from './Keyboard';
import { PhoneScreen } from './PhoneScreen';

interface PhoneDeviceProps { ready: boolean; booting: boolean; }

export const PhoneDevice = forwardRef<HTMLDivElement, PhoneDeviceProps>(function PhoneDevice({ ready, booting }, ref) {
  return <div className="device-stage" ref={ref} data-ready={ready}>
    <div className="ambient-shadow" aria-hidden="true"/>
    <section className="phone" aria-label="Interactive Sidekick-inspired portfolio device">
      <div className="phone-body" aria-hidden="true"><div className="body-ridge"/></div>
      <div className="wing wing-left" aria-hidden="true"><span className="wing-highlight"/><div className="dpad"><i/></div><span className="side-slot"/></div>
      <div className="wing wing-right" aria-hidden="true"><span className="wing-highlight"/><div className="right-controls"><span className="call-key"><svg viewBox="0 0 24 24"><path d="M7.5 4.5c1 2.2 2.3 4 3.9 5.7s3.5 3 5.7 4l2.2-2.2c.4-.4.9-.5 1.4-.3l2.1.8v5.1c0 .8-.6 1.4-1.4 1.4C12.3 19 5 11.7 5 2.6c0-.8.6-1.4 1.4-1.4h5.1l.8 2.1c.2.5.1 1-.3 1.4L9.8 6.9"/></svg></span><div className="trackball"><i/></div><span className="back-key"><svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M5 12h8c4 0 6 2 6 6"/></svg></span></div><span className="side-slot"/></div>
      <div className="keyboard-bed"><Keyboard/></div>
      <div className="contact-shadow" aria-hidden="true"/>
      <div className="motion-ghost" aria-hidden="true"/>
      <div className="display-assembly">
        <div className="display-bezel">
          <div className="speaker speaker-left speaker-upper"/><div className="speaker speaker-left speaker-lower"/>
          <div className="speaker speaker-right speaker-upper"/><div className="speaker speaker-right speaker-lower"/>
          <span className="bezel-label bezel-label-left" aria-hidden="true">PORT<span>FOLIO</span></span>
          <span className="bezel-label bezel-label-right" aria-hidden="true">ASMIT<span>.DEV</span></span>
          <div className="screen-shell"><PhoneScreen ready={ready} booting={booting}/><div className="glass-reflection" aria-hidden="true"/></div>
          <div className="notification-led" aria-hidden="true"/>
        </div>
      </div>
      <span className="pivot pivot-left" aria-hidden="true"/><span className="pivot pivot-right" aria-hidden="true"/>
    </section>
  </div>;
});
