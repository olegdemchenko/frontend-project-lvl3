const elemToString = (text, openTag, closeTag) => `${openTag}${text}${closeTag}`;

function changeRegistrationState(path, value) {
  const form = document.querySelector('.rss-form');
  const urlInput = form.querySelector('input[name="url"]');
  const button = form.querySelector('button');
  const feedBack = document.querySelector('.feedback');
  if (path === 'state') {
    switch (value) {
      case 'filling': {
        urlInput.removeAttribute('disabled');
        urlInput.value = '';
        button.removeAttribute('disabled');
        return;
      }
      case 'sending': {
        urlInput.setAttribute('disabled', '');
        button.setAttribute('disabled', '');
        feedBack.innerHTML = elemToString(this.message, '<p class="text-info">', '</p>');
        return;
      }
      case 'finished': {
        urlInput.removeAttribute('disabled');
        urlInput.value = '';
        button.removeAttribute('disabled');
        feedBack.innerHTML = elemToString(this.message, '<p class="text-success">', '</p>');
        return;
      }
      case 'failed': {
        urlInput.removeAttribute('disabled');
        button.removeAttribute('disabled');
        feedBack.innerHTML = elemToString(this.message, '<p class="text-danger">', '</p>');
        return;
      }
      default: {
        throw new Error('state is not supported');
      }
    }
  }
  if (path === 'validationState') {
    if (value === 'invalid') {
      urlInput.classList.add('is-invalid');
      feedBack.innerHTML = elemToString(this.message, '<p class="text-danger">', '</p>');
    } else {
      urlInput.classList.remove('is-invalid');
      feedBack.innerHTML = '';
    }
  }
}

function changeStateData() {
  const container = document.querySelector('.feeds');
  container.innerHTML = '';
  const { feeds, posts } = this;
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

export { changeRegistrationState, changeStateData };
