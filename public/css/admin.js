.admin-shell{display:grid;grid-template-columns:1fr;gap:12px;padding:12px;max-width:1400px;margin:0 auto}
.admin-sidebar{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.admin-nav{display:flex;flex-wrap:wrap;gap:6px}
.admin-nav button{flex:1 1 auto;min-height:40px;padding:8px 12px;font-size:12.5px;border-radius:10px;background:var(--surface2);border:1px solid var(--line2);color:var(--muted);font-weight:600;transition:.15s;text-align:left}
.admin-nav button:hover{background:var(--surface);color:var(--text)}
.admin-nav button.on{background:var(--brand-soft);color:var(--text);border-color:var(--brand)}
.admin-content{min-width:0}
.admin-table{overflow-x:auto;-webkit-overflow-scrolling:touch}
.admin-table table{min-width:640px;width:100%;border-collapse:collapse;font-size:13.5px}
.admin-table th,.admin-table td{padding:10px 12px;text-align:left}
.admin-table thead tr{border-bottom:1px solid var(--line2)}
.admin-table tbody tr{border-bottom:1px solid var(--line)}
.admin-table tbody tr:last-child{border-bottom:none}
.admin-table tbody tr:hover{background:var(--surface2)}
