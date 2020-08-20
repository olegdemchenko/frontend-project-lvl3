const corsAPI = 'https://cors-anywhere.herokuapp.com';
const getUrlWithCORSFree = (url) => new URL(`../${url}`, corsAPI).toString();
export default getUrlWithCORSFree;
