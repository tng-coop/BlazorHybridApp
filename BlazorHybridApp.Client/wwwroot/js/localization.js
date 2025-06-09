window.localization = {
  getBrowserLanguages: function () {
    if (navigator.languages && navigator.languages.length) {
      return navigator.languages;
    }
    if (navigator.language) {
      return [navigator.language];
    }
    return [];
  },
  getPreferredLanguage: function () {
    return localStorage.getItem('blazorCulture');
  },
  setPreferredLanguage: function (culture) {
    localStorage.setItem('blazorCulture', culture);
  }
};
