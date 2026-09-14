export const Router = {
  routes: {},
  register(path, handler) { this.routes[path] = handler; },
  parse() {
    const h = (location.hash || '#/').replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    return { path: path || '', params: new URLSearchParams(query || '') };
  },
  navigate(path) { location.hash = path; },
  start(fallback) {
    const run = () => {
      const { path, params } = this.parse();
      (this.routes[path] || fallback)(params);
    };
    window.addEventListener('hashchange', run);
    run();
  }
};