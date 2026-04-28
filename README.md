# Canary_Map_V2

## useful links

https://www.youtube.com/watch?v=UAQogFwyna0&list=LL&index=2&t=951s

https://maplibre.org/maplibre-gl-js/docs/examples/display-a-popup/


## Deployment Quick Reference

### Local Development
```bash
npm run dev
```
Opens at `http://localhost:5173`

### Deploy to GitHub Pages
```bash
npm run build     # builds to /dist
npm run deploy    # pushes /dist to gh-pages branch
```
Wait ~2 minutes, then hard refresh (`Cmd+Shift+R`) at:
`https://lucasbutz.github.io/Canary_Map_V2/`

### Notes
- `npm run deploy` is separate from `git push` — GitHub Pages pulls from the `gh-pages` branch, not `main`
- Always run `build` before `deploy` to catch errors first
- Chunk size warning on build is harmless (MapLibre is large)
