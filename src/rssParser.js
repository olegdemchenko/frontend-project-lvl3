import { uniqueId } from 'lodash';

const extractData = (domNode, id, type) => {
  const title = domNode.querySelector(`${domNode.tagName} > title`).textContent;
  const link = domNode.querySelector(`${domNode.tagName} > link`).textContent;
  if (type === 'post') {
    return { title, link, id };
  }
  const description = domNode.querySelector(`${domNode.tagName} > description`).textContent;
  return {
    title, description, link, id,
  };
};

export default (data) => {
  const parser = new DOMParser();
  const parsedDom = parser.parseFromString(data, 'application/xml');
  const channel = parsedDom.querySelector('channel');
  if (channel === null) {
    return null;
  }
  const id = uniqueId();
  const items = channel.querySelectorAll('item');
  return { feed: extractData(channel, id, 'feed'), posts: [...items].map((item) => extractData(item, id, 'post')) };
};
