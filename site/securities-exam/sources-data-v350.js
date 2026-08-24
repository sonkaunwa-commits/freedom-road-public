(()=>{
'use strict';
const items=[
{id:'law-01',s:'law',type:'教材变动解读',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cuwOCxL00KXk',use:'先看新版变化，建立复习优先级'},
{id:'law-02',s:'law',type:'思维导图',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cdYO9pmmKVSu',use:'建立章节框架，适合系统学习前浏览'},
{id:'law-04',s:'law',type:'考前25页纸',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/clniaoASeBrr',use:'冲刺阶段系统复盘'},
{id:'law-05',s:'law',type:'考前7页纸',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cg17xmSUehLE',use:'考前最后压缩复习'},
{id:'law-06',s:'law',type:'易错易混知识点总结',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/ciL87UpkFoBd',use:'错题复盘时重点对照'},
{id:'law-08',s:'law',type:'数字总结',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/ckJ31YArROqG',use:'集中处理期限、比例、金额等数字考点'},
{id:'law-09',s:'law',type:'必背百条',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cicqH7FpeMdp',use:'每日滚动主动回忆'},
{id:'finance-00',s:'finance',type:'新旧大纲变动对比',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cbBL9Y1pCHuU',use:'先确认2026新增、删除和调整内容'},
{id:'finance-01',s:'finance',type:'教材变动解读',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cjhe7Vb0eOKg',use:'理解新版教材变化与重点'},
{id:'finance-02',s:'finance',type:'思维导图',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/csoiWVyhUELX',use:'建立完整知识框架'},
{id:'finance-03',s:'finance',type:'口诀总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/crFJv7gyraGW',use:'把高频规则压缩成记忆钩子'},
{id:'finance-04',s:'finance',type:'考前30页纸',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cndqNzWMFuwn',use:'冲刺阶段系统压缩复习'},
{id:'finance-05',s:'finance',type:'考前7页纸',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cuoziItRc5Yk',use:'考前最后快速过一遍'},
{id:'finance-06',s:'finance',type:'易错易混知识点总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cs7qsqcYCn6U',use:'配合错题专门攻克混淆点'},
{id:'finance-08',s:'finance',type:'数字总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/csvOhrkbJuDw',use:'集中记比例、期限和数量关系'},
{id:'finance-09',s:'finance',type:'计算总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/ckHrBXLtCHHK',use:'计算题集中复习和公式回顾'},
{id:'finance-10',s:'finance',type:'必背百条',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cpMtXDwBDL6V',use:'每日滚动记忆高频考点'}
];
window.SEC_SOURCES_V350={version:'3.5.0',count:items.length,law:items.filter(x=>x.s==='law').length,finance:items.filter(x=>x.s==='finance').length,items};
})();