# -*- coding: utf-8 -*-
"""生成《钱江水利农村供水运维管理系统的研究开发》立项报告"""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


OUT = Path(__file__).with_name(
    "RD22-立项申请报告-钱江水利农村供水运维管理系统的研究开发.docx"
)


def set_run_font(run, name="宋体", size=12, bold=False):
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)


def add_center(doc, text, size=16, bold=True, name="黑体", space_after=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space_after)
    r = p.add_run(text)
    set_run_font(r, name=name, size=size, bold=bold)
    return p


def add_right(doc, text, size=12):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run(text)
    set_run_font(r, size=size)
    return p


def add_heading_cn(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    set_run_font(r, name="黑体", size=14, bold=True)
    return p


def add_body(doc, text, first_indent=True):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.space_after = Pt(6)
    if first_indent:
        pf.first_line_indent = Cm(0.74)
    r = p.add_run(text)
    set_run_font(r, name="宋体", size=12)
    return p


def set_cell_text(cell, text, bold=False, size=11):
    cell.text = ""
    p = cell.paragraphs[0]
    r = p.add_run(text)
    set_run_font(r, name="宋体", size=size, bold=bold)


def add_info_table(doc):
    table = doc.add_table(rows=3, cols=4)
    table.style = "Table Grid"
    data = [
        ("项目编号", "RD22", "项目名称", "钱江水利农村供水运维管理系统的研究开发"),
        ("项目起止时间", "2026年9月—2028年8月", "", ""),
        ("申请立项时间", "2026年8月", "申请单位", "浙江钱江水利供水有限公司"),
    ]
    # row0
    set_cell_text(table.rows[0].cells[0], data[0][0], bold=True)
    set_cell_text(table.rows[0].cells[1], data[0][1])
    set_cell_text(table.rows[0].cells[2], data[0][2], bold=True)
    set_cell_text(table.rows[0].cells[3], data[0][3])
    # row1 merge last cols for long date
    set_cell_text(table.rows[1].cells[0], "项目起止时间", bold=True)
    set_cell_text(table.rows[1].cells[1], "2026年9月—2028年8月")
    table.rows[1].cells[1].merge(table.rows[1].cells[3])
    # row2
    set_cell_text(table.rows[2].cells[0], "申请立项时间", bold=True)
    set_cell_text(table.rows[2].cells[1], "2026年8月")
    set_cell_text(table.rows[2].cells[2], "申请单位", bold=True)
    set_cell_text(table.rows[2].cells[3], "浙江钱江水利供水有限公司")
    doc.add_paragraph()


def add_budget_table(doc):
    rows = [
        ("1", "材料、燃料和动力费", "项", "1", "2"),
        ("2", "研发人员人工费用", "项", "1", "18"),
        ("3", "设备费（服务器/终端/网络等）", "项", "1", "6"),
        ("4", "折旧费用", "项", "1", "3"),
        ("5", "软件测试与系统联调费", "项", "1", "3"),
        ("6", "出版/文献/信息传播/知识产权事务费", "项", "1", "2"),
        ("7", "业务组织费（差旅、会议、试点调研等）", "项", "1", "6"),
        ("8", "劳务费", "项", "1", "/"),
        ("9", "委外费（地图服务、云资源等）", "项", "1", "3"),
        ("10", "其他费用", "项", "1", "2"),
        ("合计", "", "", "", "45"),
    ]
    table = doc.add_table(rows=1 + len(rows), cols=5)
    table.style = "Table Grid"
    headers = ["序号", "费用明细", "单位", "数量", "费用（万元）"]
    for i, h in enumerate(headers):
        set_cell_text(table.rows[0].cells[i], h, bold=True)
    for ri, row in enumerate(rows, start=1):
        for ci, val in enumerate(row):
            set_cell_text(table.rows[ri].cells[ci], val, bold=(row[0] == "合计"))


def add_team_table(doc):
    people = [
        ("1", "郑夏琼", "项目负责人", "浙江钱江水利供水有限公司"),
        ("2", "马宏国", "技术负责人", "浙江钱江水利供水有限公司"),
        ("3", "周沁璐", "技术员", "浙江钱江水利供水有限公司"),
        ("4", "凌晨", "技术员", "浙江钱江水利供水有限公司"),
        ("5", "李方渊", "技术员", "浙江钱江水利供水有限公司"),
        ("6", "申谦文", "技术员", "浙江钱江水利供水有限公司"),
        ("7", "谢成浩", "技术员", "浙江钱江水利供水有限公司"),
        ("8", "王启豪", "技术员", "浙江钱江水利供水有限公司"),
        ("9", "俞娅", "技术员", "浙江钱江水利供水有限公司"),
        ("10", "胡逸飞", "技术员", "浙江钱江水利供水有限公司"),
        ("11", "徐培豪", "技术员", "浙江钱江水利供水有限公司"),
        ("12", "周星", "市场调研员", "浙江钱江水利供水有限公司"),
    ]
    table = doc.add_table(rows=1 + len(people), cols=4)
    table.style = "Table Grid"
    for i, h in enumerate(["序号", "姓名", "职务", "工作单位"]):
        set_cell_text(table.rows[0].cells[i], h, bold=True)
    for ri, row in enumerate(people, start=1):
        for ci, val in enumerate(row):
            set_cell_text(table.rows[ri].cells[ci], val)


def add_schedule_table(doc):
    items = [
        (
            "需求分析与总体设计：梳理农村水厂/泵站/管网运维场景，完成系统架构、权限模型、数据模型与接口规范设计",
            "2026.09",
            "2026.11",
            "形成需求规格与架构说明书",
        ),
        (
            "移动端与打卡水印模块研发：现场拍照打卡、GPS定位与逆地理编码、可配置水印合成、照片规范归档",
            "2026.11",
            "2027.03",
            "微信小程序/H5联调",
        ),
        (
            "工单模板引擎与双端填报：可视化模板配置、工单流转状态机、历史追溯与团队隔离",
            "2027.01",
            "2027.06",
            "覆盖巡检、维修、水质相关作业单据",
        ),
        (
            "巡检轨迹、监控大屏与统计分析：一日路线图、实时位置监控、多维统计与报表导出、WebSocket实时推送",
            "2027.04",
            "2027.10",
            "管理端大屏可用",
        ),
        (
            "农村供水场景试点验证：选取典型水厂/管网片区试用，优化作业SOP与系统功能，编制运维作业指导书",
            "2027.07",
            "2028.03",
            "形成试点评估报告",
        ),
        (
            "成果汇总、知识产权与验收：结题报告、软件著作权申请、成果鉴定与推广方案",
            "2028.04",
            "2028.08",
            "项目验收",
        ),
    ]
    table = doc.add_table(rows=1 + len(items), cols=4)
    table.style = "Table Grid"
    for i, h in enumerate(["工作内容", "开始日期", "完成日期", "备注"]):
        set_cell_text(table.rows[0].cells[i], h, bold=True)
    for ri, row in enumerate(items, start=1):
        for ci, val in enumerate(row):
            set_cell_text(table.rows[ri].cells[ci], val, size=10)


def add_review_form(doc):
    doc.add_page_break()
    add_center(doc, "浙江钱江水利供水有限公司", size=16, name="黑体")
    add_center(doc, "项目立项评审表", size=18, name="黑体", space_after=12)
    table = doc.add_table(rows=4, cols=2)
    table.style = "Table Grid"
    set_cell_text(table.rows[0].cells[0], "项目名称", bold=True)
    set_cell_text(table.rows[0].cells[1], "钱江水利农村供水运维管理系统的研究开发")
    blocks = [
        ("专家意见：", "专家组长签名：\n年    月    日"),
        ("财务部意见：", "财务经理签名：\n年    月    日"),
        ("总经理意见：", "总经理：\n年    月    日"),
    ]
    for i, (title, sign) in enumerate(blocks, start=1):
        set_cell_text(table.rows[i].cells[0], title, bold=True)
        p = table.rows[i].cells[1].paragraphs[0]
        p.clear()
        r1 = p.add_run("\n\n\n")
        set_run_font(r1, size=12)
        r2 = p.add_run(sign)
        set_run_font(r2, size=11)
        for cell in table.rows[i].cells:
            cell.width = Cm(8)


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    add_center(doc, "浙江钱江水利供水有限公司", size=18, name="黑体")
    add_center(doc, "研究开发项目立项报告", size=22, name="黑体", space_after=18)
    add_right(doc, "申请立项时间：2026年8月                         编号：RD22")
    doc.add_paragraph()
    add_info_table(doc)

    add_heading_cn(doc, "一、立项目的")
    add_body(
        doc,
        "随着国家“十四五”农村供水保障规划深入实施，以及浙江省高水平推进城乡供水一体化、农村饮用水标准化建设，农村供水工程运维管理已从“建得成”加快迈向“管得好、管得住、管得久”。农村水厂、加压泵站、管网末梢及水质相关设施点多面广、地理分散，现场作业高度依赖一线巡检与应急处置。当前普遍存在外勤打卡难核验、巡检路线不透明、工单流转依赖纸质或零散表格、多班组/多片区数据难以隔离与汇总、现场照片缺少防篡改水印与规范归档、管理人员难以及时掌握作业进度与异常等问题，制约了农村供水运维的标准化、可视化和精细化水平。",
    )
    add_body(
        doc,
        "针对上述痛点，本课题以钱江水利农村供水业务场景为牵引，研究开发“移动端（微信小程序/H5）+ Web管理后台 + 统一后端服务”的农村供水运维管理系统。系统面向主管理员、片区/班组管理员与一线运维人员三级角色，实现现场拍照打卡与智能水印、自定义运维工单模板与双端填报流转、一日巡检路线自动生成与复盘、团队（片区）数据隔离、工作圈动态监管、照片按“团队/人员/日期”规范归档、地图监控大屏与多维统计分析及报表导出等核心能力，形成可落地、可复制的农村供水运维数字化作业闭环。",
    )
    add_body(
        doc,
        "本课题的另一目标，是把系统能力沉淀为适合农村供水特点的标准化运维作业模式与服务方案：固化巡检、维修、水质相关现场作业的数据要素与流程；形成作业指导书与培训材料；在试点片区验证“现场采集—过程留痕—后台监管—统计分析—绩效考核”闭环效果。最终提升公司农村供水运维响应效率与监管能力，降低管理成本，增强在农村供水智慧运维领域的核心竞争力，形成可向省内乃至全国同类水司推广的数字化运维服务模式。",
    )

    add_heading_cn(doc, "二、主要研究内容")
    add_body(
        doc,
        "（1）农村供水运维业务建模与系统总体架构研究：梳理水厂、泵站、管网片区等典型运维对象与作业类型，建立用户—角色—团队（片区）权限模型与数据隔离机制；设计前后端分离、模块化单体的技术架构（认证权限、工单模板、巡检轨迹、文件存储、统计报表、实时推送等模块），明确与地图地理服务、对象存储的集成方案。",
        first_indent=False,
    )
    add_body(
        doc,
        "（2）现场作业数字化采集与防篡改留痕技术：研发移动端现场拍照打卡能力，支持GPS定位、逆地理编码地址、可勾选水印要素（项目/点位名称、地址、时间、操作人、备注等）实时合成；建立服务端按“团队ID/人员ID/日期”层级自动归档的文件规范，支撑审计与打包下载。",
        first_indent=False,
    )
    add_body(
        doc,
        "（3）可配置工单模板引擎与双端协同流转：研究面向农村供水巡检、维修、水质相关作业的动态表单字段模型（文本、下拉、多选、数字、评分、图片、附件等）；实现管理端可视化模板增删改与启用/停用；移动端与Web端按模板填报、状态流转（待处理、处理中、已完成、已关闭）及历史追溯。",
        first_indent=False,
    )
    add_body(
        doc,
        "（4）巡检轨迹可视化、实时监控与统计分析：基于当日多次打卡点位生成一日巡检路线图，支持节点关联照片与工单信息；建设管理端地图总览与监控大屏，结合WebSocket实现关键数据近实时刷新；开展工单完成率、外勤合规、出勤与异常定位等多维统计，并支持Excel等报表导出。",
        first_indent=False,
    )
    add_body(
        doc,
        "（5）试点验证与标准化运维服务模式设计：选取典型农村供水片区开展试用验证，迭代优化功能与作业规范；编制《农村供水运维现场作业指导书》及培训材料；设计“数字化运维平台+标准化作业服务”推广方案。",
        first_indent=False,
    )

    add_heading_cn(doc, "三、关键技术")
    add_body(
        doc,
        "（1）多端统一认证与团队数据隔离技术：基于JWT的统一登录与角色守卫；通过团队邀请码/成员管理实现片区隔离，确保工单、打卡、照片、轨迹等数据逻辑隔离与可审计。",
        first_indent=False,
    )
    add_body(
        doc,
        "（2）移动端现场影像水印合成与规范归档技术：在拍照环节完成Canvas水印合成，降低事后补传、篡改风险；服务端按层级目录自动归档，并支持检索预览与批量打包。",
        first_indent=False,
    )
    add_body(
        doc,
        "（3）动态表单模板引擎与工单状态机技术：以JSON结构化描述表单字段，支持可视化配置与版本化启用；工单状态机驱动流转与统计口径统一，适配农村供水多样化作业单据。",
        first_indent=False,
    )
    add_body(
        doc,
        "（4）基于地理信息的巡检轨迹生成与监控可视化技术：结合高德等地图服务完成定位、逆地理编码与路线绘制；管理端实现人员分布、当日进度与历史轨迹复盘。",
        first_indent=False,
    )
    add_body(
        doc,
        "（5）实时数据同步与统计分析技术：通过WebSocket（断线轮询兜底）保障打卡/工单关键事件近实时可见；构建多维统计指标与报表导出能力，支撑绩效考核与管理决策。",
        first_indent=False,
    )

    add_heading_cn(doc, "四、创新点")
    add_body(
        doc,
        "（1）面向农村供水分散场景的“现场留痕+后台监管”一体化运维新模式。针对农村供水点多面广、班组分散特点，将防篡改水印打卡、工单填报、轨迹复盘与管理大屏贯通，改变传统纸质记录、事后补录、过程不可视的管理方式。",
        first_indent=False,
    )
    add_body(
        doc,
        "（2）可配置工单模板驱动的农村供水作业标准化创新。通过可视化模板引擎把巡检、维修、水质相关等作业单据配置化，快速适配不同水厂与片区管理要求，降低定制开发成本，提升标准化复制能力。",
        first_indent=False,
    )
    add_body(
        doc,
        "（3）“团队（片区）隔离 + 工作圈动态 + 一日路线图”的过程监管机制创新。在保障数据隔离安全的同时，以工作圈与路线图支撑负责人远程实时监管，实现从“结果检查”向“过程可视、异常可追”转变。",
        first_indent=False,
    )
    add_body(
        doc,
        "（4）可推广的数字化运维服务体系创新。将平台能力沉淀为作业指导书、培训材料与服务套餐，支撑公司从传统运维管理向“平台+数据+服务”综合能力升级，形成可向同类农村供水单位复制的商业与服务模式。",
        first_indent=False,
    )

    add_heading_cn(doc, "五、主要技术指标和经济指标")
    add_body(doc, "1、主要技术指标", first_indent=False)
    add_body(
        doc,
        "（1）建成农村供水运维管理系统1套，覆盖移动端（微信小程序/H5）与Web管理后台，支持主管理员、管理员、运维人员三级权限及团队（片区）数据隔离。",
        first_indent=False,
    )
    add_body(
        doc,
        "（2）打卡水印：支持不少于6类可配置水印要素；照片服务端按“团队/人员/日期”自动归档，支持检索、预览与打包下载。",
        first_indent=False,
    )
    add_body(
        doc,
        "（3）工单模板引擎：支持不少于8种字段类型的可视化配置；工单状态流转完整可用，双端填报联通。",
        first_indent=False,
    )
    add_body(
        doc,
        "（4）巡检与监控：支持基于打卡点生成一日巡检路线图；管理端具备地图总览/监控大屏能力，关键数据近实时刷新（WebSocket，断线轮询兜底）。",
        first_indent=False,
    )
    add_body(
        doc,
        "（5）统计分析：形成工单与打卡多维统计，支持Excel报表导出；完成不少于1个农村供水片区试点验证，编制《农村供水运维现场作业指导书》1份。",
        first_indent=False,
    )
    add_body(
        doc,
        "（6）软件成果：申请软件著作权不少于1项；形成技术报告/结题报告1套。",
        first_indent=False,
    )
    add_body(doc, "2、主要经济指标", first_indent=False)
    add_body(
        doc,
        "（1）通过数字化留痕与工单协同，缩短现场信息汇总与核查时间，降低纸质流转与重复沟通成本，提升运维监管效率。",
        first_indent=False,
    )
    add_body(
        doc,
        "（2）以平台沉淀标准化作业能力，减少因人员流动带来的培训与管理成本，提高片区复制扩张效率。",
        first_indent=False,
    )
    add_body(
        doc,
        "（3）推动公司从经验型运维管理向“平台+数据+服务”转型，形成可对外输出的数字化运维服务产品，拓展农村供水智慧运维业务空间。",
        first_indent=False,
    )
    add_body(
        doc,
        "（4）形成可向浙江省乃至全国同类农村供水单位推广的运维数字化方案，增强公司在农村供水保障领域的核心竞争力。",
        first_indent=False,
    )

    add_heading_cn(doc, "六、经费概算")
    add_budget_table(doc)
    add_body(
        doc,
        "说明：经费总额45万元，主要用于研发人工、软硬件与云资源、地图等第三方服务、试点调研差旅会议及知识产权相关费用。实际执行中按公司财务制度据实列支与调整。",
    )

    add_heading_cn(doc, "七、项目组主要研发人员")
    add_team_table(doc)
    add_body(
        doc,
        "说明：项目组成员可根据公司人事安排微调；核心研发与业务骨干保持稳定，确保课题连续推进。",
    )

    add_heading_cn(doc, "八、研发工作进度安排")
    add_schedule_table(doc)

    add_heading_cn(doc, "九、结论和建议")
    add_body(
        doc,
        "本课题紧扣钱江水利农村供水运维管理的现实需求，以移动端现场留痕与Web端过程监管为主线，以可配置工单与轨迹可视化为抓手，以标准化作业与可推广服务模式为落地点，具有明确的技术路径、可验证的成果指标和良好的转化前景。建议尽快立项并组织实施。",
    )

    add_review_form(doc)
    doc.save(OUT)
    print(str(OUT))


if __name__ == "__main__":
    build()
