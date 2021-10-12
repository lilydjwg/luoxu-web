<script>
  import { onMount, setContext } from 'svelte'
  import Message from './Message.svelte'
  import Name from './Name.svelte'

  const LUOXU_URL = 'https://lab.lilydjwg.me/luoxu'
  let groups = []
  let group
  let query
  let error
  let result
  let now = new Date()
  let loading = false
  let need_update_title = false
  let sender

  setContext('LUOXU_URL', LUOXU_URL)

  function parse_hash() {
    const hash = location.hash
    if(hash) {
      const info = new Map()
      for(const pair of hash.substring(1).split('&')){
        const [key, value] = pair.split('=')
        info.set(key, decodeURIComponent(value))
      }
      return info
    }
  }

  onMount(async () => {
    do_hash_search()
    const res = await fetch(`${LUOXU_URL}/groups`)
    groups = (await res.json()).groups
    need_update_title = true
    if(!group) {
      group = ''
    }
  })

  $: {
    // only update title on hash change (doing a search)
    if(need_update_title && groups) {
      let group_name
      for(const g of groups) {
        if(g.group_id == group) {
          group_name = g.name
        }
      }
      if(query && group_name) {
        document.title = `搜索：${query} 于 ${group_name} - 落絮`
      }else if(query) {
        document.title = `搜索：${query} - 落絮`
      }else if(group_name) {
        document.title = `搜索 ${group_name} - 落絮`
      }else{
        document.title = '落絮'
      }
      need_update_title = false
    }
  }

  function do_hash_search() {
    const info = parse_hash()
    if(info) {
      query = ''
      group = ''
      result = null
      if(info.has('g')) {
        group = info.get('g')|0
      }
      if(info.has('q')) {
        query = info.get('q')
      }
      if(group && query) {
        result = null
        do_search()
      }
    }
  }

  async function do_search(more) {
    if(!group) {
      error = '请选择要搜索的群组'
      return
    }
    if(!query) {
      error = '请输入搜索关键字'
      return
    }
    error = ''
    console.log(`searching ${query} for group ${group}, older than ${more}`)
    const q = `g=${group}&q=${encodeURIComponent(query)}`
    let url
    if(!more) {
      location.hash = `#${q}`
      need_update_title = true
      if(result) {
        result.messages = []
      }
      url = `${LUOXU_URL}/search?${q}`
    }else{
      url = `${LUOXU_URL}/search?${q}&end=${more}`
    }

    now = new Date()
    loading = true
    try{
      const res = await fetch(url)
      const r = await res.json()
      loading = false
      if(more) {
        return r
      }else{
        result = r
      }
    }catch(e){
      error = e
      loading = false
    }
  }

  async function on_group_change() {
    error = ''
    if(query) {
      await do_search()
    }
  }

  async function do_search_more() {
    const more = result.messages[result.messages.length-1].t
    const old_msgs = result.messages
    const new_result = await do_search(more)
    result.messages = [...old_msgs, ...new_result.messages]
    result.has_more = new_result.has_more
  }
</script>

<svelte:window on:hashchange={do_hash_search}/>

<main>
  <div id="searchbox">
    {#if groups.length == 0}
      <select>
        <option selected>正在加载群组信息...</option>
      </select>
    {:else}
      <select bind:value={group} on:change={on_group_change}>
        {#each groups as group}
          <option value={group.group_id}>{group.name}</option>
        {/each}
      </select>
    {/if}
    <input type="search" bind:value={query}
      on:input={() => error = ''}
      on:keydown={e => {if(e.key == 'Enter'){do_search()}}}
    />
    <Name group={group} selected={sender}/>
    <button on:click={() => do_search()}>搜索</button>
  </div>

  {#if result}
    {#each result.messages as message}
      <Message msg={message} group={result.group_pub_id} now={now} />
    {/each}
  {/if}

  {#if loading}
    <div class="info"><p>正在加载...</p></div>
  {:else}
    {#if error}
      <p class="error">{error}</p>
    {:else if result && result.messages.length == 0}
      <div class="info"><p>没有匹配的消息。</p></div>
    {:else if result && !result.has_more}
      <div class="info"><p>到底了。</p></div>
    {/if}
    {#if result && result.has_more}
      <div class="info"><button on:click={do_search_more}>加载更多</button></div>
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
  }
  #searchbox input[type=search] {
    flex-grow: 1;
  }
  @media (max-width: 500px) {
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

  :global(input), :global(button), :global(select) {
    border-radius: 0;
    border: 1px solid var(--color-inactive);
    height: 2.3em;
  }
  :global(input:focus), :global(button:focus), :global(select:focus) {
    border-color: var(--color-active);
    outline: 1px solid var(--color-active);
  }
  :global(:root) {
    --color-inactive: #bfbfbf;
    --color-active: #add8e6;
  }
</style>
