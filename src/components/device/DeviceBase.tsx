const GENERATED_ROOT = '/assets/device/generated';

export function DeviceBase() {
  return <img
    className="device-base"
    src={`${GENERATED_ROOT}/device-base-open.png`}
    alt=""
    aria-hidden="true"
    draggable={false}
  />;
}

export function GroundShadow() {
  return <div className="ambient-shadow" aria-hidden="true"/>;
}
