import semver from 'semver';
import type { Grade, Technology, TechnologyInsight } from '../types/domain.js';
import { LIBRARY_ADVISORIES } from './libraryAdvisories.js';

/** Build the grade headline shown in Brutal Roast mode. */
export function buildRoastHeadline(grade: Grade, overallScore: number): string {
  switch (grade) {
    case 'A':
      return "Annoyingly solid. We came here to roast and there's barely anything to burn.";
    case 'B':
      return "Pretty good, a few loose bolts. Not roast-worthy, just mildly toast-worthy.";
    case 'C':
      return "Middle of the pack — the website equivalent of a shrug emoji.";
    case 'D':
      return `A ${overallScore}/100. This site is held together with duct tape and optimism.`;
    case 'F':
    default:
      return "This site's security posture is basically a house with the door unlocked and a sign that says 'back in 5'.";
  }
}

// Curated hints for legacy technologies.
const LEGACY_TECH_HINTS: Record<string, { note: string; roast: string }> = {
  wordpress: {
    note: 'WordPress core itself is actively maintained, but the platform is a frequent target due to third-party plugin/theme vulnerabilities. Worth confirming plugins and the core version are current.',
    roast: "WordPress. Powers a huge chunk of the internet and an equally huge chunk of its hacked websites. Odds are at least one plugin here hasn't been touched since 2019."
  },
  joomla: {
    note: 'Joomla has a track record of critical CVEs in both core and extensions historically. Confirm the version is current and unused extensions are removed.',
    roast: 'Joomla — a CMS with a genuinely impressive back catalog of critical CVEs. Bold choice for production traffic in this decade.'
  },
  drupal: {
    note: 'Drupal has previously had mass-exploited vulnerabilities (notably "Drupalgeddon"). Confirm the patch level is current.',
    roast: 'Drupal — home of "Drupalgeddon," a vulnerability so bad it got its own nickname. Hoping this instance got that particular memo.'
  },
  php: {
    note: 'PHP itself is actively maintained, but older major versions (5.x, early 7.x) are end-of-life and receive no security patches. Worth confirming which version is actually running.',
    roast: "PHP detected. Not a crime by itself, but if this is anything before 7.4 it's basically a museum exhibit with a live internet connection."
  },
  'asp-net': {
    note: 'Classic ASP.NET Web Forms trails modern security defaults compared to ASP.NET Core. Worth confirming which framework generation is actually in use.',
    roast: "ASP.NET. If this is classic Web Forms rather than ASP.NET Core, it's giving strong 2011 enterprise-intranet energy."
  },
  'internet-explorer': {
    note: 'Signs of Internet Explorer-specific compatibility code were detected. IE was retired by Microsoft in June 2022 and no longer receives security updates.',
    roast: 'Found traces of Internet Explorer support. IE has been dead since June 2022 — this code is older than some office interns.'
  },
  flash: {
    note: 'Adobe Flash reached end-of-life in December 2020 and is blocked by every modern browser.',
    roast: "Adobe Flash. It's not 2010 anymore — Flash has been dead for years and no modern browser will even run it."
  },
  'jquery-ui': {
    note: 'jQuery UI receives infrequent updates; worth confirming the version in use is still receiving maintenance.',
    roast: 'jQuery UI — a trip down memory lane to when "Smoothness" was a design theme people picked on purpose.'
  },
  'jquery-migrate': {
    note: "jQuery Migrate exists specifically to paper over breaking changes from old jQuery code. Its presence usually signals unaddressed legacy code underneath.",
    roast: "jQuery Migrate detected — a plugin whose entire job is apologizing for how old the jQuery underneath actually is."
  }
};

// Technology categories exposed by headers or passive backend fingerprinting.
const EXPOSURE_CATEGORIES = new Set([
  'Web servers',
  'Reverse proxies',
  'Programming languages',
  'Operating systems',
  'Web frameworks'
]);

/** Add professional and roast copy to one detected technology. */
export function buildTechInsight(tech: Technology): TechnologyInsight {
  const advisory = LIBRARY_ADVISORIES[tech.slug];
  if (advisory) {
    const version = tech.version && semver.valid(semver.coerce(tech.version));
    const isOutdated = advisory.minSafeVersion === null
      || !tech.version
      || (version && semver.lt(version, advisory.minSafeVersion));

    if (isOutdated) {
      const versionLabel = tech.version ? ` v${tech.version}` : '';
      return {
        ...tech,
        note: advisory.reason,
        roast: `${tech.name}${versionLabel} — ${advisory.reason} This one made the "patch immediately" list.`
      };
    }
    return {
      ...tech,
      note: `${tech.name} is present and appears to be on a currently supported version, so no known advisory applies here.`,
      roast: `${tech.name} v${tech.version} — actually up to date. We went looking for dirt and came up empty. Annoying.`
    };
  }

  const legacy = LEGACY_TECH_HINTS[tech.slug];
  if (legacy) {
    return { ...tech, ...legacy };
  }

  if (tech.categories.some((c) => EXPOSURE_CATEGORIES.has(c))) {
    return {
      ...tech,
      note: `${tech.name} was identified from response headers/metadata rather than anything visible on the page, meaning this detail about the backend stack is passively fingerprintable by anyone — including attackers doing reconnaissance.`,
      roast: `${tech.name} showed up just from politely asking the server what it's running. That's free recon for anyone who wants it — no bouncer at this door either.`
    };
  }

  return {
    ...tech,
    note: 'No specific known issues or legacy concerns were found for this technology at the detected version.',
    roast: `${tech.name} — nothing to roast here. Boring, in the best possible way.`
  };
}
