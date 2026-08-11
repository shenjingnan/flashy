import { describe, expect, it } from 'vitest';
import {
  AUTHOR_SPACE_URL,
  AUTHOR_UID,
  checkFollowing,
  type FollowCheckResult,
} from '../core/authorGate';

/** ToyRelationLike 中 getAuthorRelation 的返回结构，保持与核心实现一致。 */
interface RelationResp {
  status: string;
  data?: { isFollowing: boolean; isAuthor?: boolean };
}

/** 构造一个可注入的 fake Toy SDK。 */
function makeToy(
  overrides: Partial<{
    isSupported: boolean;
    status: string;
    isFollowing: boolean;
    isAuthor: boolean;
    hasData: boolean;
  }> = {}
): {
  isSupport: (ability: string) => Promise<boolean>;
  getAuthorRelation: () => Promise<RelationResp>;
} {
  const {
    isSupported = true,
    status = 'ok',
    isFollowing = false,
    isAuthor = false,
    hasData = true,
  } = overrides;
  return {
    isSupport: async (ability: string) => (ability === 'getAuthorRelation' ? isSupported : false),
    getAuthorRelation: async () => {
      const result: RelationResp = { status };
      if (hasData) {
        result.data = { isFollowing, isAuthor };
      }
      return result;
    },
  };
}

/** 断言结果为指定值，失败时给出更友好的提示。 */
async function expectCheck(
  toy: ReturnType<typeof makeToy>,
  expected: FollowCheckResult
): Promise<void> {
  expect(await checkFollowing(toy)).toBe(expected);
}

describe('checkFollowing', () => {
  it('should return unknown when getAuthorRelation is not supported', async () => {
    await expectCheck(makeToy({ isSupported: false }), 'unknown');
  });

  it('should return followed when the user already follows the author', async () => {
    await expectCheck(makeToy({ status: 'ok', isFollowing: true }), 'followed');
  });

  it('should return not-followed when the user does not follow the author', async () => {
    await expectCheck(makeToy({ status: 'ok', isFollowing: false }), 'not-followed');
  });

  it('should return followed when the visitor is the author themselves', async () => {
    await expectCheck(makeToy({ status: 'ok', isAuthor: true }), 'followed');
  });

  it('should return not-followed when the user is unauthorized (not logged in)', async () => {
    await expectCheck(makeToy({ status: 'unauthorized' }), 'not-followed');
  });

  it('should return unknown for unsupported status', async () => {
    await expectCheck(makeToy({ status: 'unsupported' }), 'unknown');
  });

  it('should return unknown for unavailable status', async () => {
    await expectCheck(makeToy({ status: 'unavailable' }), 'unknown');
  });

  it('should return unknown for other non-ok statuses', async () => {
    await expectCheck(makeToy({ status: 'invalid_argument' }), 'unknown');
  });

  it('should return unknown when ok status lacks data', async () => {
    await expectCheck(makeToy({ status: 'ok', hasData: false }), 'unknown');
  });

  it('should return unknown when the SDK throws', async () => {
    const throwing = {
      isSupport: async () => true,
      getAuthorRelation: async () => {
        throw new Error('[ToySDK] boom');
      },
    };
    expect(await checkFollowing(throwing)).toBe('unknown');
  });

  it('should return unknown when isSupport itself throws', async () => {
    const throwing = {
      isSupport: async () => {
        throw new Error('[ToySDK] boom');
      },
      getAuthorRelation: async () => ({ status: 'ok' }),
    };
    expect(await checkFollowing(throwing)).toBe('unknown');
  });
});

describe('author constants', () => {
  it('should expose the UP 主 UID and space URL', () => {
    expect(AUTHOR_UID).toBe('24615859');
    expect(AUTHOR_SPACE_URL).toBe('https://space.bilibili.com/24615859');
  });
});
