var minDate = 10;
var maxDate = 14;

if (document.querySelector('.estimated_value_min_delivery_day') && document.querySelector('.estimated_value_min_delivery_day').textContent.trim() !== '') {
  minDate = parseInt(document.querySelector('.estimated_value_min_delivery_day').textContent.trim());
}
if (document.querySelector('.estimated_value_max_delivery_day') && document.querySelector('.estimated_value_max_delivery_day').textContent.trim() !== '') {
  maxDate = parseInt(document.querySelector('.estimated_value_max_delivery_day').textContent.trim());
}

var fromDate = new Date();
fromDate.setDate(fromDate.getDate() + minDate);
while (fromDate.getDay() === 6 || fromDate.getDay() === 0) {
  fromDate.setDate(fromDate.getDate() + 1);
}

var toDate = new Date();
toDate.setDate(toDate.getDate() + maxDate);
while (toDate.getDay() === 6 || toDate.getDay() === 0) {
  toDate.setDate(toDate.getDate() + 1);
}

function formatDate(date) {
  var monthNamesByLocale = {
    cs: ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"],
    de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    fr: ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
    it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    sk: ["Jan", "Feb", "Mar", "Apr", "Máj", "Jún", "Júl", "Aug", "Sep", "Okt", "Nov", "Dec"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  };
  var locale = document.documentElement.lang || 'en';
  var monthNames = monthNamesByLocale[locale] || monthNamesByLocale['en'];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var month = (monthIndex + 1).toString().padStart(2, '0');
  return monthNames[monthIndex] + " " + day + "/" + month;
}

var fromDateElement = document.getElementById('fromDate');
var toDateElement = document.getElementById('toDate');

if (fromDateElement) {
  fromDateElement.innerHTML = formatDate(fromDate);
}
if (toDateElement) {
  toDateElement.innerHTML = formatDate(toDate);
}