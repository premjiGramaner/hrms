const SUPERVISOR_UPDATED_EVENT = "supervisor-data-updated";

export function dispatchSupervisorUpdated() {
  const event = new CustomEvent(SUPERVISOR_UPDATED_EVENT);
  window.dispatchEvent(event);
}
export function onSupervisorUpdated(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(SUPERVISOR_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener(SUPERVISOR_UPDATED_EVENT, handler);
  };
}
