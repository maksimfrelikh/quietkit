// Self-hosted fonts, same setup as frelikh: Archivo (variable weight axis) for text and
// labels, IBM Plex Mono for code and tool I/O. Browsers fetch only the unicode-range
// subsets that are rendered. No Cyrillic text face yet: the UI is English-only; user
// input in a textarea falls back to the system stack, which is fine for a tool field.
import '@fontsource-variable/archivo/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
