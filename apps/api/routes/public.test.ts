import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handlePublicStats,
  handlePublicListPosts,
  handlePublicGetPost,
  handlePublicGetPage,
} from './public';

// Mock the caches global (not available in Vitest)
const cachePutMock = vi.fn().mockResolvedValue(undefined);
const cacheMatchMock = vi.fn().mockResolvedValue(undefined); // no cache hit by default
(global as any).caches = {
  default: { match: cacheMatchMock, put: cachePutMock },
};



describe('public routes', () => {
  it('handlePublicStats returns aggregate counts', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ n: 42 }),
      })
    };
    const res = await handlePublicStats(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total_programs');
    expect(body.data).toHaveProperty('total_enrolled_students');
    expect(body.data).toHaveProperty('total_applications_this_term');
  });

  it('handlePublicListPosts returns published posts with pagination', async () => {
    const posts = [{ id: 'p1', title: 'T', slug: 's', excerpt: null, tags: null, published_at: '2026-01-01', first_name: 'A', last_name: 'B' }];
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: posts }),
          first: vi.fn().mockResolvedValue({ n: 1 }),
        }),
        first: vi.fn().mockResolvedValue({ n: 1 }),
        all: vi.fn().mockResolvedValue({ results: posts }),
      })
    };
    const req = new Request('http://localhost/api/public/cms/posts?page=1');
    const res = await handlePublicListPosts(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.results[0].author.first_name).toBe('A');
    expect(body.data.total).toBe(1);
  });

  it('handlePublicListPosts parses tags from JSON', async () => {
    const posts = [{ id: 'p1', title: 'T', slug: 's', excerpt: null, tags: '["tech","news"]', published_at: '2026-01-01', first_name: 'A', last_name: 'B' }];
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: posts }),
          first: vi.fn().mockResolvedValue({ n: 1 }),
        }),
        first: vi.fn().mockResolvedValue({ n: 1 }),
        all: vi.fn().mockResolvedValue({ results: posts }),
      })
    };
    const req = new Request('http://localhost/api/public/cms/posts');
    const res = await handlePublicListPosts(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.results[0].tags).toEqual(['tech', 'news']);
  });

  it('handlePublicGetPost returns 404 if post not found', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) })
      })
    };
    const res = await handlePublicGetPost(new Request('http://localhost'), makeEnv(db), 'unknown-slug');
    expect(res.status).toBe(404);
  });

  it('handlePublicGetPost returns post with author', async () => {
    const post = { id: 'p1', title: 'Hello', slug: 'hello', excerpt: null, content: 'Body', tags: null, published_at: '2026-01-01', first_name: 'Alice', last_name: 'Smith' };
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(post) })
      })
    };
    const res = await handlePublicGetPost(new Request('http://localhost'), makeEnv(db), 'hello');
    const body = await res.json() as any;
    expect(body.data.author.first_name).toBe('Alice');
    expect(body.data.content).toBe('Body');
  });

  it('handlePublicGetPage returns 404 if page not found', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) })
      })
    };
    const res = await handlePublicGetPage(new Request('http://localhost'), makeEnv(db), 'about');
    expect(res.status).toBe(404);
  });

  it('handlePublicGetPage returns published page', async () => {
    const page = { id: 'pg1', title: 'About', slug: 'about', content: 'Content here', published_at: '2026-01-01' };
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(page) })
      })
    };
    const res = await handlePublicGetPage(new Request('http://localhost'), makeEnv(db), 'about');
    const body = await res.json() as any;
    expect(body.data.title).toBe('About');
  });
});
