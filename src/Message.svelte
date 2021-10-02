<script>
  import { onMount, getContext } from 'svelte'

  export let msg
  export let group
  export let now

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "full",
    dateStyle: "full",
    hour12: false,
  })

  let dt = new Date(msg.t * 1000)
  let edited = msg.edited ? new Date(msg.edited * 1000) : null
  let title = format_dt(dt) + (edited ? `\n最后编辑于：${format_dt(edited)}` : '')
  let relative_dt = format_relative_time(dt, now)
  let iso_date = dt.toISOString()

  function format_relative_time(d1, d2) {
    // in miliseconds
    const units = {
      year  : 24 * 60 * 60 * 1000 * 365,
      month : 24 * 60 * 60 * 1000 * 365 / 12,
      day   : 24 * 60 * 60 * 1000,
      hour  : 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000,
    }

    const rtf = new Intl.RelativeTimeFormat()

    const elapsed = d1 - d2

    for(const u in units) {
      if(Math.abs(elapsed) > units[u] || u == 'second')  {
        return rtf.format(Math.round(elapsed/units[u]), u)
      }
    }

  }

  function format_dt(t) {
    return formatter.format(t)
  }

</script>

<div>
  <div class="message">
    <img src="{getContext('LUOXU_URL')}/avatar/{msg.from_id}.jpg" height="64" width="64" alt="{msg.from_name} 的头像"/>
    <div>
      <div class="name">{msg.from_name}</div>
      <div class="body"><pre>{msg.text}</pre></div>
      <div class="time"><a href="tg://resolve?domain={group}&post={msg.id}"><time datetime={iso_date} title={title}>{relative_dt}</time></a></div>
    </div>
  </div>
</div>

<style>
  .message {
    margin: 1em;
    padding: 0.5em;
    max-width: max-content;
    border: 1px #eeeeee solid;
    box-shadow: 0 0 3px gray;
    border-radius: 5px;
    display: flex;
  }
  .message::after {
    content: '';
    display: block;
    clear: both;
  }
  img {
    padding-right: 0.5em;
  }
  .name {
    white-space: nowrap;
    color: #1e90ff;
  }
  pre {
    white-space: break-spaces;
    margin: 0.2em 0;
  }
  .time {
    font-size: 0.75em;
    float: right;
  }
  .time > a {
    color: gray;
  }
</style>
