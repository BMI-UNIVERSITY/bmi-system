import { describe, it, expect, vi } from 'vitest';
import {
  handleListPosts,
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
  handleListPages,
  handleCreatePage,
  handleDeletePage,
} from './cms';

vi.mock('../lib/types', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    logAdminAction: vi.fn().mockResolvedValue(undefined),
  };
});

function makeDB(firstVal: any = null, allResults: any[] = []) {
  const firstMock = vi.fn().mockResolvedValue(firstVal);
  const allMock = vi.fn().mockResolvedValue({ results: allResults });
  const runMock = vi.fn().mockResolvedValue({});
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: firstMock, all: allMock, run: runMock }),
      all: allMock,
    }),
    _first: firstMock,
    _all: allMock,
  };
}

describe('cms posts routes', () => {
  it('handleListPosts returns list with author and parsed tags', async () => {
    const db = makeDB(null, [
      { id: 'p1', title: 'Post 1', slug: 'post-1', tags: '["news"]', first_name: 'Alice', last_name: 'Smith' },
    ]);
    const res = await handleListPosts(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].tags).toEqual(['news']);
    expect(body.data[0].author.first_name).toBe('Alice');
  });

  it('handleCreatePost returns 400 if title missing', async () => {
    const db = makeDB();
    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'No title here' }),
    });
    const res = await handleCreatePost(req, { DB: db as any } as any, 'author1');
    expect(res.status).toBe(400);
  });

  it('handleCreatePost returns 409 if slug exists', async () => {
    const db = makeDB({ id: 'existing' });
    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Existing Post' }),
    });
    const res = await handleCreatePost(req, { DB: db as any } as any, 'author1');
    expect(res.status).toBe(409);
  });

  it('handleCreatePost creates draft post', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Post', tags: ['tech'], status: 'published' }),
    });
    const res = await handleCreatePost(req, { DB: db as any } as any, 'author1');
    const body = await res.json() as any;
    expect(body.data.status).toBe('published');
    expect(body.data.slug).toBe('new-post');
  });

  it('handleUpdatePost returns 404 if post not found', async () => {
    const db = makeDB(null);
    const req = new Request('http://localhost/api/cms/posts/p-none', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const res = await handleUpdatePost(req, { DB: db as any } as any, 'p-none', 'editor1');
    expect(res.status).toBe(404);
  });

  it('handleUpdatePost updates existing post', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'p1', status: 'draft' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const req = new Request('http://localhost/api/cms/posts/p1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title', status: 'published' }),
    });
    const res = await handleUpdatePost(req, { DB: db as any } as any, 'p1', 'editor1');
    const body = await res.json() as any;
    expect(body.data.status).toBe('published');
  });

  it('handleDeletePost returns 404 if post not found', async () => {
    const db = makeDB(null);
    const res = await handleDeletePost(new Request('http://localhost'), { DB: db as any } as any, 'p-none', 'admin1');
    expect(res.status).toBe(404);
  });

  it('handleDeletePost deletes post successfully', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'p1' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const res = await handleDeletePost(new Request('http://localhost'), { DB: db as any } as any, 'p1', 'admin1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});

describe('cms pages routes', () => {
  it('handleListPages returns page list', async () => {
    const db = makeDB(null, [{ id: 'pg1', title: 'About', slug: 'about', status: 'published' }]);
    const res = await handleListPages(new Request('http://localhost'), { DB: db as any } as any);
    const body = await res.json() as any;
    expect(body.data[0].slug).toBe('about');
  });

  it('handleCreatePage returns 400 if title missing', async () => {
    const db = makeDB();
    const req = new Request('http://localhost/api/cms/pages', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await handleCreatePage(req, { DB: db as any } as any, 'author1');
    expect(res.status).toBe(400);
  });

  it('handleCreatePage returns 409 if slug taken', async () => {
    const db = makeDB({ id: 'pg-existing' });
    const req = new Request('http://localhost/api/cms/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'About' }),
    });
    const res = await handleCreatePage(req, { DB: db as any } as any, 'author1');
    expect(res.status).toBe(409);
  });

  it('handleCreatePage creates page successfully', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const req = new Request('http://localhost/api/cms/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Contact Us', status: 'published' }),
    });
    const res = await handleCreatePage(req, { DB: db as any } as any, 'author1');
    const body = await res.json() as any;
    expect(body.data.slug).toBe('contact-us');
  });

  it('handleDeletePage returns 404 if page not found', async () => {
    const db = makeDB(null);
    const res = await handleDeletePage(new Request('http://localhost'), { DB: db as any } as any, 'pg-none', 'admin1');
    expect(res.status).toBe(404);
  });

  it('handleDeletePage deletes page', async () => {
    const db = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'pg1' }),
          run: vi.fn().mockResolvedValue({}),
        }),
      }))
    };
    const res = await handleDeletePage(new Request('http://localhost'), { DB: db as any } as any, 'pg1', 'admin1');
    const body = await res.json() as any;
    expect(body.data.deleted).toBe(true);
  });
});
