export function pathLike(out: string, suffix: string) {
  const base = out.replace(/\\\\/g, "/");
  return base.substring(0, base.lastIndexOf("/")) + "/" + suffix;
}