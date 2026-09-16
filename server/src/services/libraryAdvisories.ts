// Curated client-library advisories used by the security checks.
export interface LibraryAdvisory {
  minSafeVersion: string | null;
  reason: string;
}

export const LIBRARY_ADVISORIES: Record<string, LibraryAdvisory> = {
  jquery: {
    minSafeVersion: '3.5.0',
    reason: 'Versions before 3.5.0 are affected by XSS vulnerabilities in jQuery.htmlPrefilter (CVE-2020-11022/CVE-2020-11023).'
  },
  bootstrap: {
    minSafeVersion: '4.3.1',
    reason: 'Versions before 4.3.1 have XSS vulnerabilities in the tooltip/popover data-template attribute (CVE-2019-8331). Bootstrap 3.x is end-of-life.'
  },
  angularjs: {
    minSafeVersion: null,
    reason: 'AngularJS (1.x) reached end-of-life in January 2022 and no longer receives security patches. Migrate to Angular (2+), React, or Vue.'
  },
  lodash: {
    minSafeVersion: '4.17.21',
    reason: 'Versions before 4.17.21 are affected by prototype pollution and command injection vulnerabilities.'
  },
  moment: {
    minSafeVersion: null,
    reason: 'Moment.js is in maintenance mode and recommends migrating to a modern alternative (date-fns, Luxon, or the native Temporal API).'
  },
  handlebars: {
    minSafeVersion: '4.7.7',
    reason: 'Versions before 4.7.7 are affected by remote code execution / prototype pollution vulnerabilities when compiling untrusted templates.'
  },
  underscore: {
    minSafeVersion: '1.13.0',
    reason: 'Versions before 1.13.0 are affected by a template arbitrary code execution vulnerability (CVE-2021-23358).'
  }
};
