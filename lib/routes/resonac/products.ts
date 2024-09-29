import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
// import { parseDate } from '@/utils/parse-date';
// import timezone from '@/utils/timezone';

const baseUrl = 'https://www.resonac.com';
const host = 'https://www.resonac.com/products?intcid=glnavi_products';

export const route: Route = {
    path: '/products',
    categories: ['other'],
    example: '/resonac/products',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Resonac_Products',
    maintainers: ['valuex'],
    handler,
    description: '',
};

async function handler() {
    const response = await got(host);
    const pageHtml = response.data;
    const $ = load(pageHtml);
    const groupLists = $('div.m-panel-card-link  ul  li')
        .toArray()
        .map((el) => ({
            groupName: $('a', el).text().trim(),
            groupURL: baseUrl + $('a', el).attr('href'),
        }));

    const lists = await Promise.all(
        groupLists.map((productGroup) =>
            cache.tryGet(productGroup.groupURL, async () => {
                const strUrl = productGroup.groupURL;
                const response = await got(strUrl);
                const $ = load(response.data);
                const item = $('dt.m-toggle__title  div  span')
                    .toArray()
                    .map((el) => ({
                        title: $('a b', el).text().trim() || 'Empty',
                        link: $('a', el).attr('href') || 'undefined',
                        group: productGroup.groupName,
                    }));
                return item;
            })
        )
    );

    let fullList = lists.flat(1); // flatten array
    fullList = fullList.filter((item) => item.link !== 'undefined');
    // fullList = fullList.filter((item) => item.title !== 'Empty');

    const items = await Promise.all(
        fullList.map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const productPageUrl = baseUrl + item.link;
                    const response = await got(productPageUrl);
                    const $ = load(response.data);
                    const thisTitle = item.title + ' | ' + item.group;
                    item.title = thisTitle;
                    item.description = $('main  div.str-section').html();
                    item.pubDate = '2024-09-29'; // item.pubDate;
                    return item;
                } catch (error) {
                    return (error as Error).message;
                }
            })
        )
    );

    return {
        title: 'Resonac_Products',
        link: baseUrl,
        description: 'Resonac_Products',
        item: items,
    };
}
