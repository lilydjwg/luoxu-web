<script lang="ts">
  import { onMount, setContext } from "svelte";
  import Message from "./Message.svelte";
  import Name from "./Name.svelte";
  import { sleep } from "./util.js";

  const LUOXU_URL = "https://lab.lilydjwg.me/luoxu";
  const islocal = LUOXU_URL.startsWith("http://localhost");
  let groups: { group_id: string; name: string }[] = [];
  let group: string;
  let query: string;
  let error: string;
  let result: {
    messages: {
      from_name: string;
      t;
      edited;
      group_id: string;
      id: string;
      from_id: string;
      html: string;
    }[];
    has_more: boolean;
    groupinfo: string[][];
  };
  let now = new Date();
  let loading = false;
  let need_update_title = false;
  let sender: string;
  let selected_init: string;
  let our_hash_change = false;
  let abort = new AbortController();

  setContext("LUOXU_URL", LUOXU_URL);

  function parse_hash() {
    const hash = location.hash;
    if (hash) {
      return new URLSearchParams(hash.substring(1));
    }
  }

  onMount(async () => {
    do_hash_search();
    while (true) {
      try {
        const res = await fetch(`${LUOXU_URL}/groups`);
        groups = (await res.json()).groups;
        need_update_title = true;
        if (!group) {
          group = "";
        }
        break;
      } catch (e) {
        console.error("failed to fetch group info, will retry", e);
        await sleep(1000);
      }
    }
  });

  $: {
    // only update title on hash change (doing a search)
    if (need_update_title && groups) {
      let group_name: string;
      for (const g of groups) {
        if (g.group_id === group) {
          group_name = g.name;
        }
      }
      if (query && group_name) {
        document.title = `搜索：${query} 于 ${group_name} - 落絮`;
      } else if (query) {
        document.title = `搜索：${query} - 落絮`;
      } else if (group_name) {
        document.title = `搜索 ${group_name} - 落絮`;
      } else {
        document.title = "落絮";
      }
      need_update_title = false;
    }
  }

  function do_hash_search() {
    const info = parse_hash();
    if (info) {
      query = "";
      group = "";
      result = null;
      if (info.has("g")) {
        group = info.get("g");
      }
      if (info.has("q")) {
        query = info.get("q");
      }
      if (info.has("sender")) {
        sender = info.get("sender");
        selected_init = sender;
      }
      if ((group || islocal) && query) {
        result = null;
        do_search();
      }
    }
  }

  async function do_search(more?: HTMLMouseEventHandler<HTMLButtonElement>) {
    abort.abort();
    abort = new AbortController();
    if (!group && !islocal) {
      error = "请选择要搜索的群组";
      return;
    }
    if (!query && !islocal) {
      error = "请输入搜索关键字";
      return;
    }
    error = "";
    our_hash_change = true;
    console.log(
      `searching ${query} for group ${group}, older than ${more}, from ${sender}`
    );
    const q = new URLSearchParams();
    if (group) {
      q.append("g", group);
    }
    if (query) {
      q.append("q", query);
    }
    if (sender) {
      q.append("sender", sender);
    }
    let url: RequestInfo | URL;
    const qstr = q.toString();
    if (!more) {
      location.hash = `#${qstr}`;
      need_update_title = true;
      if (result) {
        result.messages = [];
      }
      url = `${LUOXU_URL}/search?${qstr}`;
    } else {
      url = `${LUOXU_URL}/search?${q}&end=${more}`;
    }

    now = new Date();
    loading = true;
    try {
      const res = await fetch(url, { signal: abort.signal });
      const r = await res.json();
      loading = false;
      if (abort.signal.aborted) {
        return [];
      }
      if (more) {
        return r;
      } else {
        result = r;
      }
    } catch (e) {
      error = e;
      loading = false;
    }
    our_hash_change = false;
  }

  async function on_group_change() {
    error = "";
    if (query) {
      await do_search();
    }
  }

  async function do_search_more() {
    const more = result.messages[result.messages.length - 1].t;
    const old_msgs = result.messages;
    const new_result = await do_search(more);
    result.messages = [...old_msgs, ...new_result.messages];
    result.has_more = new_result.has_more;
  }
</script>

<svelte:window
  on:hashchange={() => {
    if (!our_hash_change) do_hash_search();
  }}
/>

<main>
  <div id="searchbox">
    {#if groups.length === 0}
      <select>
        <option selected>正在加载群组信息...</option>
      </select>
    {:else}
      <select bind:value={group} on:change={on_group_change}>
        {#if islocal}
          <option value="">全部</option>
        {/if}
        {#each groups as group}
          <option value={group.group_id}>{group.name}</option>
        {/each}
      </select>
    {/if}
    <input
      type="search"
      bind:value={query}
      on:input={() => (error = "")}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          do_search();
        }
      }}
    />
    <Name {group} bind:selected={sender} {selected_init} />
    <button on:click={do_search}>搜索</button>
  </div>

  {#if result}
    {#each result.messages as message}
      <Message msg={message} groupinfo={result.groupinfo} {now} />
    {/each}
  {:else if !loading && !error}
    <div>
      <p>
        搜索消息时，搜索字符串不区分简繁（会使用 OpenCC
        自动转换），也不进行分词（请手动将可能不连在一起的词语以空格分开）。
      </p>
      <p>搜索字符串支持以下功能：</p>
      <ul>
        <li>以空格分开的多个搜索词是「与」的关系</li>
        <li>使用 OR（全大写）来表达「或」条件</li>
        <li>使用 - 来表达排除，如 落絮 - 测试</li>
        <li>使用小括号来分组</li>
      </ul>
      <p>人名补全支持上下方向键和 Alt+N/P 进行选择。</p>
      <p>
        搜索结果右下角的时间，悬停可查看绝对时间、最后编辑时间（如编辑过），点击可跳转到
        Telegram 中展示该消息。
      </p>
    </div>
  {/if}

  {#if loading}
    <div class="info"><p>正在加载...</p></div>
  {:else}
    {#if error}
      <p class="error">{error}</p>
    {:else if result && result.messages.length === 0}
      <div class="info"><p>没有匹配的消息。</p></div>
    {:else if result && !result.has_more}
      <div class="info"><p>到底了。</p></div>
    {/if}
    {#if result && result.has_more}
      <div class="info">
        <button on:click={do_search_more}>加载更多</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  main {
    margin: 1em;
  }

  button {
    white-space: nowrap;
  }

  #searchbox {
    display: flex;
    margin-left: 1px;
  }
  #searchbox > :global(*) {
    /* make borders collapse */
    margin-left: -1px;
  }
  #searchbox input[type="search"] {
    flex-grow: 1;
  }
  @media (max-width: 700px) {
    #searchbox {
      flex-direction: column;
    }
  }

  .error {
    color: red;
    text-align: center;
  }

  .info {
    display: flex;
    justify-content: center;
  }
  .info > * {
    padding: 0.5em 1em;
    margin: 1em 0;
  }
  .info > p {
    border: 1px #bfbfbf solid;
    border-radius: 2em;
  }

  :global(input),
  :global(button),
  :global(select) {
    border-radius: 0;
    border: 1px solid var(--color-inactive);
    height: 2.3em;
  }
  :global(input:focus),
  :global(button:focus),
  :global(select:focus) {
    border-color: var(--color-active);
    outline: 1px solid var(--color-active);
    /* make focus border topmost */
    z-index: 10;
  }
  :global(:root) {
    --color-inactive: #bfbfbf;
    --color-active: #add8e6;
  }
</style>
