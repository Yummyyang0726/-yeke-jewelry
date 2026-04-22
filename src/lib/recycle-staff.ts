/**
 * 各门店登记人（柜台员工）名单 —— 前端下拉选项
 *
 * 为什么硬编码、不入库：
 *  - 名单变动频率极低（年度级），加一张 Staff 表 + 管理 UI 的投入 > 改一行代码
 *  - 列表顺序和"其他"位置需要可控，配置入库后反而容易被误编辑
 *  - 老板换人时直接改这里、重新部署即可
 *
 * key 使用门店 shortName（见 prisma/recycle.db 的 RecycleStore.shortName）。
 * 前端根据选中的 storeId → 查 store.shortName → 取对应数组；找不到时回落到 ['其他']。
 *
 * "其他" 表示登记人不在预置名单里，选择后前端会额外弹出一个姓名输入框，提交时存入
 * RecycleRecord.operatorDisplayName。session 登录名始终一起存在 operatorName，审计用。
 */

export const OTHER_OPTION = '其他'

export const RECYCLE_STAFF_BY_STORE: Record<string, string[]> = {
  城隍庙二楼: ['陈盈盈', '周拉拉', '孙静', '周红霞', OTHER_OPTION],
  城隍庙一楼: ['胡丽蓉', '孙荣萍', '杨青', '周红霞', OTHER_OPTION],
  五角场万达: ['汤小群', '唐革兰', '申红霞', OTHER_OPTION],
}

export function getStaffForStore(storeShortName: string): string[] {
  return RECYCLE_STAFF_BY_STORE[storeShortName] ?? [OTHER_OPTION]
}
