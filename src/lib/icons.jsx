// Line icons from the Leadsmith prototype. Paths are fixed strings, so injecting them is safe.
const PATHS = {
  cal: ["<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2\"></rect><path d=\"M3.5 10h17M8 3v4M16 3v4\"></path>", 1.7],
  inbox: ["<path d=\"M3.5 13.5 6 5.5h12l2.5 8V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z\"></path><path d=\"M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5\"></path>", 1.7],
  clock: ["<circle cx=\"12\" cy=\"12\" r=\"8.5\"></circle><path d=\"M12 7.5V12l3 2\"></path>", 1.7],
  doc: ["<path d=\"M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z\"></path><path d=\"M14 3.5V8h4M9 12h6M9 15.5h6\"></path>", 1.7],
  wrench: ["<path d=\"M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3z\"></path><path d=\"M14.5 6.5 17 4l3 3-2.5 2.5\"></path>", 1.7],
  chart: ["<path d=\"M4 20h16M7 20V10M11 20V5M15 20v-7M19 20v-4\"></path>", 1.7],
  grid: ["<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"8\" rx=\"1.5\"></rect><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"5\" rx=\"1.5\"></rect><rect x=\"13.5\" y=\"11.5\" width=\"7\" height=\"9\" rx=\"1.5\"></rect><rect x=\"3.5\" y=\"14.5\" width=\"7\" height=\"6\" rx=\"1.5\"></rect>", 1.7],
  coin: ["<circle cx=\"12\" cy=\"12\" r=\"8.5\"></circle><path d=\"M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 2.9 5.7 1.6 5.7 4.3 0 1.3-1.2 2.1-2.9 2.1-1.4 0-2.5-.6-3-1.6M12 6.2v1.6M12 16.3v1.6\"></path>", 1.7],
  bell: ["<path d=\"M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z\"></path><path d=\"M10 20.5a2 2 0 0 0 4 0\"></path>", 1.7],
  users: ["<circle cx=\"9\" cy=\"8.5\" r=\"3.5\"></circle><path d=\"M2.5 19.5a6.5 6.5 0 0 1 13 0\"></path><circle cx=\"17\" cy=\"9.5\" r=\"2.5\"></circle><path d=\"M16 14.2a5 5 0 0 1 5.5 5.3\"></path>", 1.7],
  store: ["<path d=\"M4 9.5 5.5 4.5h13L20 9.5\"></path><path d=\"M4 9.5h16v1a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0z\"></path><path d=\"M5.5 12.5v7h13v-7M10 19.5v-4h4v4\"></path>", 1.7],
  bank: ["<path d=\"M3.5 9.5 12 4.5l8.5 5\"></path><path d=\"M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 19.5h17\"></path>", 1.7],
  kbd: ["<rect x=\"2.5\" y=\"6\" width=\"19\" height=\"12\" rx=\"2\"></rect><path d=\"M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10\"></path>", 1.7],
  link: ["<path d=\"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1\"></path><path d=\"M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1\"></path>", 1.7],
  sliders: ["<path d=\"M4 7h10M18 7h2M4 17h4M12 17h8M4 12h2M10 12h10\"></path><circle cx=\"16\" cy=\"7\" r=\"2\"></circle><circle cx=\"10\" cy=\"17\" r=\"2\"></circle><circle cx=\"8\" cy=\"12\" r=\"2\"></circle>", 1.7],
  search: ["<circle cx=\"11\" cy=\"11\" r=\"6.5\"></circle><path d=\"m16 16 4 4\"></path>", 2],
  plus: ["<path d=\"M12 5v14M5 12h14\"></path>", 2],
  pencil: ["<path d=\"M5 19l1-4L15.5 5.5a2 2 0 0 1 3 3L9 18z\"></path>", 1.8],
  tag: ["<path d=\"M4 4h7l9 9-7 7-9-9z\"></path><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"></circle>", 1.8],
  reply: ["<path d=\"M9 7 4 12l5 5\"></path><path d=\"M4 12h10a6 6 0 0 1 6 6\"></path>", 1.8],
  check: ["<path d=\"m5 12.5 4.5 4.5L19 7.5\"></path>", 2.6],
  alert: ["<circle cx=\"12\" cy=\"12\" r=\"9\"></circle><path d=\"M12 7.5v5.5M12 16.5h.01\"></path>", 2],
  send: ["<path d=\"m21 3-7 18-3.5-7.5L3 10z\"></path><path d=\"M21 3 10.5 13.5\"></path>", 1.8],
  flag: ["<path d=\"M5 21V4M5 4h11l-2 4 2 4H5\"></path>", 1.8],
  x: ["<path d=\"M6 6l12 12M18 6 6 18\"></path>", 2],
  back: ["<path d=\"m15 5-7 7 7 7\"></path>", 2],
  next: ["<path d=\"m9 5 7 7-7 7\"></path>", 2],
  mail: ["<rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"1.5\"></rect><path d=\"m4 6.5 8 6 8-6\"></path>", 1.7],
  phone: ["<path d=\"M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4 5.5a2 2 0 0 1 2-2z\"></path>", 1.7],
  share: ["<path d=\"M12 15V4M8 8l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7\"></path>", 1.8],
  list: ["<path d=\"M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01\"></path>", 2],
  board: ["<rect x=\"3\" y=\"4\" width=\"5\" height=\"16\" rx=\"1\"></rect><rect x=\"10\" y=\"4\" width=\"5\" height=\"11\" rx=\"1\"></rect><rect x=\"17\" y=\"4\" width=\"4\" height=\"13\" rx=\"1\"></rect>", 1.7],
  pause: ["<path d=\"M8 5v14M16 5v14\"></path>", 2.4],
  play: ["<path d=\"M7 5v14l11-7z\"></path>", 2],
  copy: ["<rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"></rect><path d=\"M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1\"></path>", 1.7],
  dl: ["<path d=\"M12 4v11M7 10l5 5 5-5M5 20h14\"></path>", 1.8],
};

export function Icon({ name, className, title }) {
  const [d, w] = PATHS[name] || PATHS.doc;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
