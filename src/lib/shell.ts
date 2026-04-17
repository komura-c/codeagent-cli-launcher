export function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

export function shellEscapePath(str: string): string {
  if (/^[A-Za-z0-9_.\/~@-]+$/.test(str)) {
    return str;
  }
  if (str.startsWith("~/")) {
    return "~/" + shellEscape(str.slice(2));
  }
  return shellEscape(str);
}
