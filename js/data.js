/* ============================================================
   工单协作系统 演示数据

   命名原则（参考 Apollo UX Writing Guide 与 Design System Charter）：
   - 不用 Acme / John Doe / "江城" 这类一眼假的占位名
   - 公司名按「地域 + 字號 + 行业」构成，规模和名字要对得上
   - 人名长短不一，留一个长机构名专门测布局
   - 数字必须自洽：本周新增 = 七日之和，负载之和 ≈ 新增，饼图合计 = 中心数
   ============================================================ */

const CUSTOMERS = [
  { id: 'c1', name: '临平康泰大药房', short: '康泰', industry: '医药零售', scale: '84 家门店',
    contact: '周敏', role: '运营经理', phone: '138****5521', since: '2025-03', health: 'good', total: 46 },
  { id: 'c2', name: '萧山恒远精密机械', short: '恒远', industry: '精密制造', scale: '2 个厂区',
    contact: '陈建国', role: '信息主管', phone: '139****8873', since: '2025-07', health: 'warn', total: 31 },
  { id: 'c3', name: '滨江区人民医院', short: '滨医', industry: '综合医疗', scale: '3 个院区',
    contact: '王丽娟', role: '信息科主任', phone: '137****2210', since: '2025-11', health: 'good', total: 58 },
  { id: 'c4', name: '小满食堂', short: '小满', industry: '连锁餐饮', scale: '126 家门店',
    contact: '周晓峰', role: '运营总监', phone: '136****9042', since: '2026-01', health: 'risk', total: 39 },
  { id: 'c5', name: '顺达物流', short: '顺达', industry: '区域物流', scale: '38 条线路',
    contact: '赵鹏', role: '调度主管', phone: '135****6614', since: '2026-04', health: 'good', total: 22 },
  /* 故意留一个 12 字的长机构名，用来暴露卡片里的折行问题 */
  { id: 'c6', name: '杭州临平职业高级中学', short: '临职', industry: '中等教育', scale: '3 个校区 · 4200 名师生',
    contact: '孙雅琴', role: '教务处', phone: '134****3387', since: '2026-06', health: 'warn', total: 17 },
];

const STATUSES = [
  { key: 'new',    label: '待分配', color: '#5A6068' },
  { key: 'doing',  label: '处理中', color: '#E0A15C' },
  { key: 'wait',   label: '待确认', color: '#8A9099' },
  { key: 'done',   label: '已解决', color: '#5FA97C' },
];

const OWNERS = ['方哲', '张启明', '李文博', '陈璐'];

/* 相对时间生成：让演示永远"新鲜" */
const now = Date.now();
const H = 3600 * 1000;
const rel = h => new Date(now - h * H);

const TICKETS = [
  {
    id: 'TK-2041', customer: 'c1', status: 'doing', priority: '紧急', type: '系统故障',
    title: '收银端登录提示“网络异常”，84 家门店有一半打不开',
    desc: '早上 8 点门店陆续反馈收银端登录失败，提示“网络异常，请联系管理员”。总部后台可以正常登录，门店端不行。门店网管重启过路由器，问题依旧。目前 40 多家门店只能手写小票。',
    owner: '方哲', created: rel(2.5), updated: rel(0.3), sla: '超时 26 分钟',
    timeline: [
      { t: rel(2.5), title: '客户提交工单', meta: '周敏 · 电话 + 工单' },
      { t: rel(2.2), title: '自动分派给方哲', meta: '规则：系统故障 / 医药零售' },
      { t: rel(1.8), title: '远程接入门店 001', meta: '确认现象，抓包发现请求打到旧网关' },
      { t: rel(0.9), title: '定位：DNS 缓存未刷新', meta: '门店路由器仍缓存上周切换前的解析记录' },
      { t: rel(0.3), title: '推送临时方案', meta: '远程下发 DNS 刷新脚本，已恢复 31 家' },
    ],
  },
  {
    id: 'TK-2040', customer: 'c2', status: 'doing', priority: '高', type: '数据问题',
    title: '生产报表和车间盘点对不上，差了 338 件',
    desc: '昨天的日生产报表显示 A 线产出 1240 件，车间实际盘点 902 件。质检工序的返工记录似乎没被扣减。客户希望今天下班前给结论。',
    owner: '李文博', created: rel(6), updated: rel(1.1), sla: '剩余 3 小时',
    timeline: [
      { t: rel(6), title: '客户提交工单', meta: '陈建国 · 企业微信' },
      { t: rel(5.4), title: '分派给李文博', meta: '规则：数据问题 / 精密制造' },
      { t: rel(3), title: '拉取近 7 天工序记录', meta: '发现返工单状态字段为 NULL' },
      { t: rel(1.1), title: '初步结论', meta: '报表 SQL 未处理返工扣减分支，待与开发确认' },
    ],
  },
  {
    id: 'TK-2039', customer: 'c4', status: 'wait', priority: '高', type: '需求变更',
    title: '会员储值想跨门店通用，现在只能回原店消费',
    desc: '小满今年新开了 30 家店，顾客投诉储值卡在别的门店用不了。客户希望改成全部门店通用，余额同步要求实时。',
    owner: '张启明', created: rel(26), updated: rel(4), sla: '待客户确认方案',
    timeline: [
      { t: rel(26), title: '客户提交工单', meta: '周晓峰 · 工单系统' },
      { t: rel(24), title: '需求评估会', meta: '涉及储值账户模型改造，预估 12 人日' },
      { t: rel(9), title: '输出方案 A/B', meta: 'A：总部集中账户；B：门店间日终对账' },
      { t: rel(4), title: '等待客户确认', meta: '已发送方案对比表，客户内部评审中' },
    ],
  },
  {
    id: 'TK-2038', customer: 'c3', status: 'doing', priority: '紧急', type: '系统故障',
    title: '门诊叫号屏黑屏，3 个诊区同时不显示',
    desc: '上午 10 点开始，门诊 2 楼、3 楼、5 楼的叫号屏全部黑屏，护士站电脑端叫号正常。患者聚在走廊，现场压力很大。',
    owner: '方哲', created: rel(4), updated: rel(0.6), sla: '剩余 40 分钟',
    timeline: [
      { t: rel(4), title: '客户提交工单', meta: '王丽娟 · 电话' },
      { t: rel(3.9), title: '升级为紧急', meta: '影响患者就诊秩序' },
      { t: rel(3.2), title: '远程检查叫号服务', meta: '服务进程存活，推送接口 200' },
      { t: rel(1.5), title: '发现屏端离线', meta: '3 台屏的 IP 冲突，被新接入设备占用' },
      { t: rel(0.6), title: '协调院方信息科改 IP', meta: '已改 2 台，剩 1 台待重启' },
    ],
  },
  {
    id: 'TK-2037', customer: 'c5', status: 'done', priority: '中', type: '使用咨询',
    title: '司机端怎么批量导入今天的配送单',
    desc: '调度员想一次导入 200 多条配送单，目前在 APP 里只能一条条加，问有没有批量方式。',
    owner: '陈璐', created: rel(30), updated: rel(22), sla: '已解决',
    timeline: [
      { t: rel(30), title: '客户提交工单', meta: '赵鹏 · 在线客服' },
      { t: rel(29), title: '回复操作路径', meta: '调度台 → 配送单 → 导入模板（附操作截图 3 张）' },
      { t: rel(22), title: '客户确认解决', meta: '已成功导入 214 条' },
    ],
  },
  {
    id: 'TK-2036', customer: 'c6', status: 'new', priority: '中', type: '使用咨询',
    title: '排课冲突检测没生效，同一位老师被排了两节课',
    desc: '新学期排课，系统没有提示冲突，导出后才发现有 7 位老师在同一时间被安排了两个班。',
    owner: null, created: rel(1.2), updated: rel(1.2), sla: '待分派',
    timeline: [
      { t: rel(1.2), title: '客户提交工单', meta: '孙雅琴 · 邮件' },
    ],
  },
  {
    id: 'TK-2035', customer: 'c1', status: 'wait', priority: '低', type: '需求变更',
    title: '日报能不能按门店分组导出',
    desc: '现在只能导出全公司汇总，区域经理希望按自己负责的门店分组导出，方便发群里。',
    owner: '张启明', created: rel(50), updated: rel(12), sla: '待客户确认',
    timeline: [
      { t: rel(50), title: '客户提交工单', meta: '周敏 · 工单系统' },
      { t: rel(46), title: '评估：可配置项，2 人日', meta: '已排入下个迭代' },
      { t: rel(12), title: '已上线灰度', meta: '等客户试用后确认' },
    ],
  },
  {
    id: 'TK-2034', customer: 'c2', status: 'done', priority: '高', type: '系统故障',
    title: 'MES 和 ERP 的库存同步断了 5 小时',
    desc: '早上发现 MES 里的原料库存和 ERP 差了一大截，同步日志停在凌晨 3 点。',
    owner: '李文博', created: rel(54), updated: rel(48), sla: '已解决',
    timeline: [
      { t: rel(54), title: '客户提交工单', meta: '陈建国 · 电话' },
      { t: rel(53), title: '检查同步任务', meta: '定时任务被前一天的补数脚本锁住' },
      { t: rel(50), title: '解开锁并补数', meta: '补同步 5 小时数据，核对一致' },
      { t: rel(48), title: '客户确认', meta: '库存已对齐' },
    ],
  },
  {
    id: 'TK-2033', customer: 'c4', status: 'new', priority: '紧急', type: '系统故障',
    title: '外卖订单不进系统，门店只能手工录',
    desc: '11 点开始外卖订单没有自动进系统，感觉是平台同步断了，3 家门店高峰时段积压了 60 多单，营业额跟外卖平台后台对不上。',
    owner: null, created: rel(0.4), updated: rel(0.4), sla: '待分派',
    timeline: [
      { t: rel(0.4), title: '客户提交工单', meta: '周晓峰 · 电话' },
    ],
  },
  {
    id: 'TK-2032', customer: 'c3', status: 'done', priority: '中', type: '数据问题',
    title: '上月门诊量比 HIS 少了 1200 人次',
    desc: '月度报表和 HIS 系统导出对不上，怀疑是退号没有正确回冲。',
    owner: '陈璐', created: rel(76), updated: rel(70), sla: '已解决',
    timeline: [
      { t: rel(76), title: '客户提交工单', meta: '王丽娟 · 工单系统' },
      { t: rel(72), title: '比对两边明细', meta: '确实少 1213 条退号记录' },
      { t: rel(70), title: '修正统计口径', meta: '退号回冲逻辑已补，重跑报表一致' },
    ],
  },
  {
    id: 'TK-2031', customer: 'c6', status: 'doing', priority: '低', type: '使用咨询',
    title: '新入职的 30 位老师怎么批量开账号',
    desc: '新学期入职教师需要开通教务系统账号，一个个加太慢。',
    owner: '张启明', created: rel(20), updated: rel(6), sla: '剩余 1 天',
    timeline: [
      { t: rel(20), title: '客户提交工单', meta: '孙雅琴 · 邮件' },
      { t: rel(18), title: '提供导入模板', meta: '附字段说明与示例文件' },
      { t: rel(6), title: '客户反馈导入失败 3 条', meta: '工号重复，已在协助核对' },
    ],
  },
  {
    id: 'TK-2030', customer: 'c5', status: 'done', priority: '低', type: '使用咨询',
    title: '运单打印模板想加一栏客户备注',
    desc: '面单上需要一个"客户备注"栏，方便司机看特殊要求。',
    owner: '陈璐', created: rel(96), updated: rel(90), sla: '已解决',
    timeline: [
      { t: rel(96), title: '客户提交工单', meta: '赵鹏 · 工单系统' },
      { t: rel(92), title: '配置模板', meta: '在打印模板里新增备注字段并调整宽度' },
      { t: rel(90), title: '客户确认', meta: '已生效' },
    ],
  },
  {
    id: 'TK-2029', customer: 'c1', status: 'done', priority: '中', type: '系统故障',
    title: '医保结算偶发失败，重试两次才过',
    desc: '部分门店刷医保卡时提示“交易超时”，同一张卡重试两三次能成功。每天大约七八笔。',
    owner: '方哲', created: rel(120), updated: rel(112), sla: '已解决',
    timeline: [
      { t: rel(120), title: '客户提交工单', meta: '周敏 · 工单系统' },
      { t: rel(118), title: '抓取失败报文', meta: '医保前置机返回 504，本地重试间隔过短' },
      { t: rel(112), title: '调整重试策略', meta: '间隔从 0.5 秒改到 2 秒，观察三天无复现' },
    ],
  },
  {
    id: 'TK-2028', customer: 'c2', status: 'done', priority: '中', type: '使用咨询',
    title: '质检工位怎么绑定扫码枪型号',
    desc: '新上的 6 个质检工位换了扫码枪，扫码后光标不跳转，需要手动点下一个输入框。',
    owner: '陈璐', created: rel(140), updated: rel(136), sla: '已解决',
    timeline: [
      { t: rel(140), title: '客户提交工单', meta: '陈建国 · 企业微信' },
      { t: rel(138), title: '确认是回车后缀问题', meta: '新型号默认不发 CR，配置里加上后缀即可' },
      { t: rel(136), title: '远程配置并验证', meta: '6 个工位全部正常' },
    ],
  },
  {
    id: 'TK-2027', customer: 'c3', status: 'wait', priority: '中', type: '需求变更',
    title: '体检报告希望支持批量打印骑缝章',
    desc: '体检中心每天出 200 多份报告，现在一份份盖章太慢，问能不能批量打。',
    owner: '张启明', created: rel(64), updated: rel(30), sla: '待客户确认',
    timeline: [
      { t: rel(64), title: '客户提交工单', meta: '王丽娟 · 工单系统' },
      { t: rel(60), title: '确认打印设备型号', meta: '现有打印机不支持骑缝，需换设备或改版式' },
      { t: rel(30), title: '已给两套方案', meta: '等院方定预算' },
    ],
  },
  {
    id: 'TK-2026', customer: 'c4', status: 'done', priority: '高', type: '数据问题',
    title: '日营业额和外卖平台对账单差了 1200 元',
    desc: '3 家门店的日营业额比平台后台少，怀疑是退款单没同步。',
    owner: '李文博', created: rel(72), updated: rel(66), sla: '已解决',
    timeline: [
      { t: rel(72), title: '客户提交工单', meta: '周晓峰 · 电话' },
      { t: rel(70), title: '拉平台退款流水', meta: '7 笔部分退款未回写，合计 1186 元' },
      { t: rel(66), title: '补数并修同步逻辑', meta: '金额已对齐' },
    ],
  },
  {
    id: 'TK-2025', customer: 'c5', status: 'doing', priority: '中', type: '系统故障',
    title: '电子面单打印出来条码模糊，扫描枪扫不出',
    desc: '换了新的一批面单纸之后，条码打印发虚，仓库扫码枪识别率不到一半。',
    owner: '陈璐', created: rel(9), updated: rel(2), sla: '剩余 5 小时',
    timeline: [
      { t: rel(9), title: '客户提交工单', meta: '赵鹏 · 工单系统' },
      { t: rel(7), title: '要了打印样张', meta: '对比发现热敏浓度偏低' },
      { t: rel(2), title: '给了临时参数', meta: '打印浓度从 8 调到 12，等客户实测' },
    ],
  },
  {
    id: 'TK-2024', customer: 'c5', status: 'done', priority: '低', type: '使用咨询',
    title: '怎么给新来的调度员开只读账号',
    desc: '新招两个调度员，只需要看线路和车辆位置，不能改派单。',
    owner: '张启明', created: rel(150), updated: rel(146), sla: '已解决',
    timeline: [
      { t: rel(150), title: '客户提交工单', meta: '赵鹏 · 在线客服' },
      { t: rel(148), title: '新建“调度只读”角色', meta: '附权限对照表' },
      { t: rel(146), title: '客户确认', meta: '两个账号已开通' },
    ],
  },
  {
    id: 'TK-2023', customer: 'c6', status: 'done', priority: '中', type: '数据问题',
    title: '学生成绩导入后班级平均分算错',
    desc: '导入 3 个班的期末成绩，平均分把缺考按 0 分算了。',
    owner: '李文博', created: rel(180), updated: rel(174), sla: '已解决',
    timeline: [
      { t: rel(180), title: '客户提交工单', meta: '孙雅琴 · 邮件' },
      { t: rel(178), title: '确认口径', meta: '缺考应排除，不计入分母' },
      { t: rel(174), title: '修正统计并重算', meta: '三个班平均分已重出' },
    ],
  },
];

/* 近 7 天：created 之和 = 135，与 KPI「本周新增」一致 */
const WEEK = {
  labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  created: [18, 22, 16, 27, 31, 12, 9],
  solved:  [15, 20, 19, 24, 28, 14, 8],
};

/* 问题类型分布：合计 428 = 饼图中心数 */
const TYPES = [
  { name: '系统故障', value: 148, color: '#E0A15C' },
  { name: '数据问题', value: 96,  color: '#B47E46' },
  { name: '使用咨询', value: 121, color: '#785636' },
  { name: '需求变更', value: 63,  color: '#4A423A' },
];

/* KPI */
const KPIS = [
  { label: '本周新增工单', value: 135, unit: '条', delta: 12, dir: 'up', hint: '较上周' },
  { label: '平均首次响应', value: 23, unit: '分钟', delta: -18, dir: 'down', hint: '较上周' },
  { label: '一次解决率', value: 86.4, unit: '%', delta: 3.2, dir: 'up', hint: '较上周' },
  { label: '超时工单', value: 4, unit: '条', delta: -2, dir: 'down', hint: '较上周' },
];

/* 客户工单统计（前端算） */
function ticketCountByCustomer(cid) {
  return TICKETS.filter(t => t.customer === cid).length;
}
function openCountByCustomer(cid) {
  return TICKETS.filter(t => t.customer === cid && t.status !== 'done').length;
}

/* 本周处理量（按人）：合计 120，接近新增 135 */
const LOAD = [
  { who: '方哲',  n: 38, color: '224,161,92' },
  { who: '张启明', n: 31, color: '168,122,72' },
  { who: '李文博', n: 29, color: '110,120,128' },
  { who: '陈璐',  n: 22, color: '80,86,92' },
];

/* 首次响应时长（分钟）：均值 23 */
const RESP = [30, 25, 22, 18, 21, 27, 18];

/* 客户健康度文案 */
const HEALTH_TXT = { good: '正常', warn: '关注', risk: '预警' };
