const extractData = (domNode, type) => {
  const titleElem = domNode.querySelector(`${domNode.tagName} > title`);
  const title = titleElem.textContent;
  const linkElem = domNode.querySelector(`${domNode.tagName} > link`);
  const link = linkElem.textContent;
  if (type === 'post') {
    return { title, link };
  }
  const descriptionElem = domNode.querySelector(`${domNode.tagName} > description`);
  const description = descriptionElem.textContent;
  return {
    title, description, link,
  };
};

export default (data) => {
  const parser = new DOMParser();
  const parsedDom = parser.parseFromString(data, 'application/xml');
  const channel = parsedDom.querySelector('channel');
  if (channel === null) {
    return null;
  }
  const items = channel.querySelectorAll('item');
  return { feed: extractData(channel, 'feed'), posts: [...items].map((item) => extractData(item, 'post')) };
};
