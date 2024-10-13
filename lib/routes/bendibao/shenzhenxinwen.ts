import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/szcs',
    categories: ['new-media'],
    example: '/bendibao/szcs',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['bendibao.com/'],
        },
    ],
    name: '深圳城事',
    maintainers: ['valuex'],
    handler,
    url: 'bendibao.com',
    description: '深圳城事',
};

async function handler() {
    const rootUrl = 'https://m.bendibao.com/news/list.php?sid=17&cid=1720';
    const domainUrl = 'https://m.bendibao.com';
    const response = await got({
        method: 'get',
        url: rootUrl,
    });

    const $ = load(response.data);
    const title = '深圳城事';
    const lists = $('div.sec-list-body a')
        .toArray()
        .map((el) => ({
            title: $(el).text(),
            link: domainUrl + $(el).attr('href'),
        }));

    const items = await Promise.all(
        lists.map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const detailResponse = await got({
                        method: 'get',
                        url: item.link,
                    });

                    const $ = load(detailResponse.data);
                    item.description = $('div.content-box').html();
                    // Spans for publish dates are the same cases as above.
                    item.pubDate = timezone(parseDate($('span.public_time').text()), 10);
                    return item;
                } catch {
                    return '';
                }
            })
        )
    );

    return {
        title,
        link: rootUrl,
        item: items,
    };
}
