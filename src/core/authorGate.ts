/**
 * 烧录前的 UP 主关注校验。
 *
 * 当页面运行在 B站 Toy 环境（window.toy 存在）时，通过 Toy JS SDK 检查
 * 当前访问用户是否已关注当前 Toy 的作者（即本 UP 主）。未关注时拦截并引导关注，
 * 其余情况一律放行，保证普通浏览器 / 本地开发等非 Toy 场景不受影响。
 */

/** UP 主 B站 UID（空间页路径中的 mid）。SDK 不暴露作者 mid，需在此硬编码。 */
export const AUTHOR_UID = '24615859';

/** UP 主空间页地址，作为 toy.navigate 不可用时的兜底跳转目标。 */
export const AUTHOR_SPACE_URL = 'https://space.bilibili.com/24615859';

/** 关注校验结果。 */
export type FollowCheckResult = 'followed' | 'not-followed' | 'unknown';

/**
 * Toy SDK 的最小依赖面（结构类型，便于测试注入 fake，避免耦合完整 ToySDK.Toy）。
 */
interface ToyRelationLike {
  isSupport(ability: string): Promise<boolean>;
  getAuthorRelation(): Promise<{
    status: string;
    data?: { isFollowing: boolean; isAuthor?: boolean };
  }>;
}

/**
 * 检查当前访问用户是否已关注 UP 主。
 *
 * 策略（fail-open）：
 * - 已关注 / 作者本人 → 'followed'
 * - 明确未关注 / 未登录（unauthorized）→ 'not-followed'（拦截）
 * - SDK 缺失、环境不支持、网络异常、其他错误状态 → 'unknown'（放行）
 */
export async function checkFollowing(toy: ToyRelationLike): Promise<FollowCheckResult> {
  try {
    if (!(await toy.isSupport('getAuthorRelation'))) {
      return 'unknown';
    }
    const resp = await toy.getAuthorRelation();
    if (resp.status === 'ok' && resp.data !== undefined) {
      if (resp.data.isAuthor) {
        return 'followed'; // UP 主本人放行
      }
      return resp.data.isFollowing ? 'followed' : 'not-followed';
    }
    if (resp.status === 'unauthorized') {
      return 'not-followed'; // 未登录按未关注拦截
    }
    return 'unknown'; // unsupported / unavailable / 其他状态 → 放行
  } catch {
    return 'unknown'; // SDK 异常 → 放行
  }
}
