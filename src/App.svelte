<script lang="ts">
  import { run } from "svelte/legacy";

  import { Login } from "sveltegram";
  import { onMount, setContext } from "svelte";
  import Message from "./Message.svelte";
  import Name from "./Name.svelte";
  import { sleep, tg_oauth_data } from "./util.js";
  import "./global.css";
  import { get } from "svelte/store";

  const LUOXU_URL = "https://apps.archlinuxcn.org/luoxu";
  const islocal = LUOXU_URL.startsWith("http://localhost");
  const LUOXUAUTHBOT = "";
  let groups: { group_id: string; name: string; token?: string }[] = $state([]);
  let group: string = $state();
  let token: string = $state();
  let query: string = $state();
  let error: string = $state();
  let result: {
    messages: {
      from_name: string;
      t: any;
      edited: any;
      group_id: string;
      id: string;
      from_id: string;
      html: string;
    }[];
    has_more: boolean;
    groupinfo: string[][];
  } = $state();
  let now = $state(new Date());
  let loading = $state(false);
  let need_update_title = $state(false);
  let sender: string = $state();
  let selected_init: string = $state();
  let our_hash_change = $state(false);
  let abort = new AbortController();
  let tg_oauth_button: boolean = $state(false);

  function on_tg_auth(data) {
    tg_oauth_data.set(data);
    fetch_groups();
  }

  function log_out() {
    tg_oauth_data.set(null);
    tg_oauth_button = false;
    groups = [];
    group = "";
    token = "";
    location.hash = "";
    result = {
      messages: [],
      has_more: false,
      groupinfo: [],
    };
    fetch_groups();
  }

  setContext("LUOXU_URL", LUOXU_URL);

  function parse_hash() {
    const hash = location.hash;
    if (hash) {
      return new URLSearchParams(hash.substring(1));
    }
  }

  onMount(async () => {
    const _tg_oauth_data = get(tg_oauth_data);
    if (_tg_oauth_data) {
      now = new Date();
      const expire = (_tg_oauth_data.auth_date + 60 * 60 * 24 * 30) * 1000;
      if (now.getTime() > expire) {
        tg_oauth_data.set(null);
      }
    }
    do_hash_search();
    fetch_groups();
  });

  run(() => {
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
  });

  async function fetch_groups() {
    while (true) {
      let url = `${LUOXU_URL}/groups`;
      const q = new URLSearchParams();
      const _tg_oauth_data = get(tg_oauth_data);
      if (_tg_oauth_data) {
        const _tg_auth_info = btoa(
          String.fromCharCode(
            ...new TextEncoder().encode(JSON.stringify(_tg_oauth_data)),
          ),
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        q.append("auth", _tg_auth_info);
      }
      if (group && token) {
        q.append("g", group);
        q.append("token", token);
      }
      url += `?${q.toString()}`;
      try {
        const res = await fetch(url);
        groups = (await res.json()).groups;
        need_update_title = true;
        if (!group) {
          group = "";
        }
        if (!token) {
          token = "";
        }
        break;
      } catch (e) {
        console.error("failed to fetch group info, will retry", e);
        await sleep(1000);
      }
    }
  }
  function do_hash_search() {
    const info = parse_hash();
    if (info) {
      query = "";
      group = "";
      token = "";
      result = null;
      if (info.has("g")) {
        group = info.get("g");
      }
      if (info.has("token")) {
        token = info.get("token");
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

  let concurrency = 0;
  async function do_search(more?: any) {
    concurrency += 1;
    try {
      abort.abort();
      abort = new AbortController();
      if (!group && !islocal) {
        error = "请选择要搜索的群组";
        return;
      }
      if (!query && !islocal && !sender) {
        error = "请输入搜索关键字";
        return;
      }
      error = "";
      our_hash_change = true;
      console.log(
        `searching ${query} for group ${group}, older than ${more}, from ${sender}`,
      );
      const q = new URLSearchParams();
      if (group) {
        q.append("g", group);
        const _token = groups.find((g) => g.group_id === group)?.token;
        if (_token) {
          q.append("token", _token);
        } else if (token) {
          q.append("token", token);
        }
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
        if (concurrency <= 1) {
          error = e;
          loading = false;
        }
      }
      our_hash_change = false;
    } finally {
      concurrency -= 1;
    }
  }

  async function on_group_change() {
    error = "";
    token = groups.find((g) => g.group_id === group)?.token || "";
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
  onhashchange={() => {
    if (!our_hash_change) do_hash_search();
  }}
/>

<main>
  {#if LUOXUAUTHBOT}
    <div style="text-align: right">
      {#if !$tg_oauth_data}
        {#if tg_oauth_button}
          <Login
            username={LUOXUAUTHBOT}
            buttonRadius={0}
            onauth={(data) => {
              on_tg_auth(data);
            }}
          />
        {:else}
          <button onclick={() => (tg_oauth_button = true)}>登录</button>
        {/if}
      {:else}
        已登录为 {$tg_oauth_data?.first_name}
        <button onclick={log_out}>退出</button>
      {/if}
    </div>
  {/if}

  <div id="searchbox">
    {#if groups.length === 0}
      <select>
        <option selected>正在加载群组信息...</option>
      </select>
    {:else}
      <select bind:value={group} onchange={on_group_change}>
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
      oninput={() => (error = "")}
      onkeydown={(e) => {
        if (e.key === "Enter") {
          do_search();
        }
      }}
    />
    <Name {group} {token} bind:selected={sender} {selected_init} />
    <button onclick={() => do_search()}>搜索</button>
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
        <button onclick={do_search_more}>加载更多</button>
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
    padding-bottom: 8px;
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
    color: var(--color-error);
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
    border: 1px solid var(--color-border);
    border-radius: 2em;
  }
</style>
