/**
 * @jest-environment jsdom
 */
import {
  show, hide,
  showNotification,
} from '../ui.js';

const FIXTURE = `
  <div id="notificationArea" class="notification-area hidden"></div>
  <div id="joinSection"       class="hidden"></div>
  <div id="waitingSection"    class="hidden"></div>
`;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
describe('show / hide', () => {
  it('show removes the hidden class', () => {
    show('joinSection');
    expect(document.getElementById('joinSection')!.classList.contains('hidden')).toBe(false);
  });

  it('hide adds the hidden class', () => {
    document.getElementById('joinSection')!.classList.remove('hidden');
    hide('joinSection');
    expect(document.getElementById('joinSection')!.classList.contains('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('showNotification', () => {
  it('sets the notification text', () => {
    showNotification('something went wrong', 'error');
    expect(document.getElementById('notificationArea')!.textContent).toBe('something went wrong');
  });

  it('applies the given type as a class', () => {
    showNotification('heads up', 'info');
    expect(document.getElementById('notificationArea')!.className).toContain('info');
  });

  it('removes the hidden class immediately', () => {
    showNotification('msg', 'error');
    expect(document.getElementById('notificationArea')!.classList.contains('hidden')).toBe(false);
  });

  it('hides the notification after 4 seconds', () => {
    showNotification('msg', 'error');
    jest.advanceTimersByTime(4000);
    expect(document.getElementById('notificationArea')!.classList.contains('hidden')).toBe(true);
  });
});
