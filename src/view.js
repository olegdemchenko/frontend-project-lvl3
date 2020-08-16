const toString = (message, openTag, closeTag) => `${openTag}${message}${closeTag}`;

function changeRegistrationState(path, value) {
  const form = document.querySelector('.rss-form');
  const feedBack = document.querySelector('.feedback');
  if (path === 'state') {
    switch (value) {
      case 'filling': {
        form.url.removeAttribute('disabled');
        form.url.value = '';
        form.button.removeAttribute('disabled');
        return;
      }
      case 'sending': {
        form.url.setAttribute('disabled', '');
        form.button.setAttribute('disabled', '');
        feedBack.innerHTML = toString(this.message, '<p class="text-info">', '</p>');
        return;
      }
      case 'finished': {
        form.url.removeAttribute('disabled');
        form.url.value = '';
        form.button.removeAttribute('disabled');
        feedBack.innerHTML = toString(this.message, '<p class="text-success">', '</p>');
        return;
      }
      case 'failed': {
        form.url.removeAttribute('disabled');
        form.button.removeAttribute('disabled');
        feedBack.innerHTML = toString(this.message, '<p class="text-danger">', '</p>');
        return;
      }
      default: {
        throw new Error('state is not supported');
      }
    }
  }
  if (path === 'validationState') {
    if (value === 'invalid') {
      form.url.classList.add('is-invalid');
      feedBack.innerHTML = toString(this.message, '<p class="text-danger">', '</p>');
    } else {
      form.url.classList.remove('is-invalid');
      feedBack.innerHTML = '';
    }
  }
}

function changeStateRSS(path, value) {
  const container = document.querySelector('.feeds');
  container.innerHTML = '';
  if (path === 'rss') {
    const { feeds, posts } = value;
    feeds.forEach(({ title, id }) => {
      const fragment = document.createDocumentFragment();
      const header = document.createElement('h2');
      header.textContent = title;
      fragment.append(header);
      const feedPosts = posts.filter((post) => post.id === id);
      feedPosts.forEach(({ title: postTitle, link }) => {
        const post = document.createElement('div');
        const a = document.createElement('a');
        a.href = link;
        a.textContent = postTitle;
        post.append(a);
        fragment.append(post);
      });
      container.append(fragment);
    });
  }
}

export { changeRegistrationState, changeStateRSS };
