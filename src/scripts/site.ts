/* Site-wide behaviour: the theme toggle. Everything else lives in the tool islands. */

const THEME_KEY = 'quietkit_theme';
type Theme = 'dark' | 'light';
const html = document.documentElement;

const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Effective theme: the attribute when set, otherwise what the OS is showing. */
const currentTheme = (): Theme => {
  const t = html.getAttribute('data-theme');
  return t === 'dark' || t === 'light' ? t : systemTheme();
};

const toggle = document.getElementById('themeToggle');
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

const reflect = () => {
  toggle?.setAttribute('aria-pressed', String(currentTheme() === 'light'));
  const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
  if (bg && themeColor) themeColor.setAttribute('content', bg);
};

/* A theme change is a change of context, not an interaction with a control: it lands as a
   cut, not a cross-fade. The kit disables transitions while data-theme-switching is set; the
   forced style read commits the new colours inside that window. */
const apply = (next: Theme | null) => {
  html.setAttribute('data-theme-switching', '');
  if (next) html.setAttribute('data-theme', next);
  else html.removeAttribute('data-theme');
  void getComputedStyle(html).backgroundColor;
  requestAnimationFrame(() => html.removeAttribute('data-theme-switching'));
  reflect();
};

toggle?.addEventListener('click', () => {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  try {
    if (next === systemTheme()) {
      // Picking what the OS shows anyway stores "system": follow the OS from now on.
      localStorage.removeItem(THEME_KEY);
      apply(null);
    } else {
      localStorage.setItem(THEME_KEY, next);
      apply(next);
    }
  } catch {
    apply(next);
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!html.hasAttribute('data-theme')) reflect();
});

reflect();
