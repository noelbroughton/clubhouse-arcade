// Sets the icon and version details on Clubhouse.exe (electron-builder's own step needs Wine on Linux).
const fs = require('fs'), path = require('path');
exports.default = async ctx => {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const R = ResEdit.default || ResEdit;
  const exe = path.join(ctx.appOutDir, 'Clubhouse.exe');
  const pe = R.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = R.NtExecutableResource.from(pe);
  const ico = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'build', 'icon.ico')));
  const groups = R.Resource.IconGroupEntry.fromEntries(res.entries);
  const ids = groups.length ? groups.map(g => g.id) : [1];
  for (const id of ids) R.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, 1033, ico.icons.map(i => i.data));
  const v = ctx.packager.appInfo.version, [a, b, c] = v.split('.').map(Number);
  const vi = R.Resource.VersionInfo.fromEntries(res.entries)[0] || R.Resource.VersionInfo.createEmpty();
  vi.setFileVersion(a, b, c, 0); vi.setProductVersion(a, b, c, 0);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, { FileDescription: 'Clubhouse', ProductName: 'Clubhouse', CompanyName: 'Noel Broughton', OriginalFilename: 'Clubhouse.exe', InternalName: 'Clubhouse', LegalCopyright: 'Noel Broughton', FileVersion: v, ProductVersion: v });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('  • set icon and version on Clubhouse.exe');
};
