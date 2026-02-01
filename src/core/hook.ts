function pathPatternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]+");

  return new RegExp("^" + escaped + "$");
}

export function Hook(
  path: string,
  callback: () => void
) {
  let fired = false;
  const re = pathPatternToRegex(path);

  const check = () => {
    if (
      location.hostname.endsWith("albumoftheyear.org") &&
      re.test(location.pathname)
    ) {
      if (!fired) {
        fired = true;
        callback();
      }
    } else {
      fired = false;
    }
  };

  check();
}
