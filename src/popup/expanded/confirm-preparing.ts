/**
 * State of the confirm modal while a transaction is being prepared.
 *
 * Lives outside expanded.ts — like asset-marker — so `node --test` can
 * exercise it. That is not a cosmetic split: the first version of this logic
 * lived inside the IIFE, could not be tested, and shipped with a bug that
 * left Cancel unable to close the modal and, as a knock-on, Broadcast dead
 * (Cancel had already set the pending transaction to null).
 *
 * Deliberately import-free and DOM-free: it takes a `host` with the concrete
 * operations. What is tested here is what gets called, and in what order.
 */

/** The modal operations this state machine needs. */
export interface ConfirmPreparingHost {
  /** Renders `rows` ghost rows in place of the outputs. */
  showGhosts(rows: number): void;
  setTitle(text: string): void;
  setSubtitle(text: string): void;
  setStatus(text: string): void;
  /** Shows or hides the wave bar and the status line. */
  toggleProgress(visible: boolean): void;
  /** Marks the panel as "preparing" (the CSS uses it). */
  togglePreparing(on: boolean): void;
  setBroadcastEnabled(on: boolean): void;
  setModalVisible(visible: boolean): void;
}

/** Default copy for each state, so callers do not repeat it. */
export const PREPARING_SUBTITLE =
  'Preparing the transaction. Nothing is sent until you confirm.';
export const READY_SUBTITLE =
  'Check the outputs below. Once broadcast, this cannot be reversed.';

export interface ConfirmPreparing {
  /** Opens the modal in its preparing state. Returns this run's token. */
  open(title: string, ghostRows?: number): number;
  /** Updates the status line, if the token is still the current one. */
  setProgress(token: number, text: string): void;
  /** Is this still the preparation the user is waiting for? */
  isCurrent(token: number): boolean;
  /** Is a preparation in flight? */
  isPreparing(): boolean;
  /**
   * The real content is painted: leave the preparing state but keep the modal
   * OPEN, which is what the user has in front of them.
   */
  settle(): void;
  /** Closes the modal. Always, preparing or not. */
  close(): void;
  /** Closes only if a preparation was in flight; otherwise touches nothing. */
  closeIfPreparing(): void;
  /** Forgets the in-flight preparation without touching the modal. */
  abandon(): void;
}

/**
 * @param host - The concrete modal operations
 * @returns The preparation controller
 */
export function createConfirmPreparing(host: ConfirmPreparingHost): ConfirmPreparing {
  let seq = 0;
  let active = 0;

  function leavePreparingState(): void {
    active = 0;
    host.togglePreparing(false);
    host.toggleProgress(false);
    host.setSubtitle(READY_SUBTITLE);
  }

  return {
    open(title: string, ghostRows = 4): number {
      const token = ++seq;
      active = token;
      host.setTitle(title);
      host.setSubtitle(PREPARING_SUBTITLE);
      host.togglePreparing(true);
      host.toggleProgress(true);
      host.setStatus('Starting…');
      host.showGhosts(ghostRows);
      host.setBroadcastEnabled(false);
      host.setModalVisible(true);
      return token;
    },

    setProgress(token: number, text: string): void {
      if (active !== token) return;
      host.setStatus(text);
    },

    isCurrent(token: number): boolean {
      return active !== 0 && active === token;
    },

    isPreparing(): boolean {
      return active !== 0;
    },

    settle(): void {
      leavePreparingState();
    },

    close(): void {
      leavePreparingState();
      host.setModalVisible(false);
    },

    closeIfPreparing(): void {
      if (active === 0) return;
      this.close();
    },

    abandon(): void {
      active = 0;
    }
  };
}
