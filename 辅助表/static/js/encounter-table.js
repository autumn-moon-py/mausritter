// 遭遇表存储与解析（导入使用自定义 modal，避免依赖浏览器 prompt/alert）
import { $, h } from './util.js';
import { parseEncounterTable } from './parser.js';

/** @type {{[k:number]:string} | null} */
let table = null;
const subscribers = new Set();

export function getTable () { return table; }
export function subscribe ( fn ) { subscribers.add( fn ); return () => subscribers.delete( fn ); }
function notify () { subscribers.forEach( fn => fn( table ) ); }

// ---------- 自定义 modal ----------
function openImportModal ()
{
    return new Promise( ( resolve ) =>
    {
        const backdrop = h( 'div', { class: 'modal-backdrop' } );
        const dialog = h( 'div', { class: 'modal-dialog' } );
        const title = h( 'div', { class: 'modal-title' }, '导入遭遇表' );
        const ta = h( 'textarea', {
            class: 'modal-textarea',
            rows: '8',
        } );
        const err = h( 'div', { class: 'modal-err', style: 'display:none' } );
        const cancel = h( 'button', { class: 'btn ghost', onclick: close }, '取消' );
        const ok = h( 'button', { class: 'btn', onclick: confirm }, '导入' );
        const actions = h( 'div', { class: 'modal-actions' }, [ cancel, ok ] );
        dialog.append( title, ta, err, actions );
        backdrop.appendChild( dialog );
        document.body.appendChild( backdrop );
        ta.focus();

        function close ( result )
        {
            backdrop.remove();
            document.removeEventListener( 'keydown', onKey );
            resolve( result );
        }
        function confirm ()
        {
            const t = parseEncounterTable( ta.value );
            if ( !t )
            {
                err.textContent = '未识别到遭遇表，请使用 markdown 表格 (| d6 | 遭遇 |)';
                err.style.display = 'block';
                return;
            }
            close( t );
        }
        function onKey ( e )
        {
            if ( e.key === 'Escape' ) close( null );
            else if ( e.key === 'Enter' && ( e.metaKey || e.ctrlKey ) ) confirm();
        }
        backdrop.addEventListener( 'click', ( e ) => { if ( e.target === backdrop ) close( null ); } );
        document.addEventListener( 'keydown', onKey );
    } );
}

// ---------- 公开入口 ----------
export async function importEncounterTable ()
{
    const t = await openImportModal();
    if ( !t ) return;
    table = t;
    $( 'enc-table-status' ).textContent = `已导入 ${ Object.keys( t ).length } 条`;
    notify();
    renderPreview();
}

export function clearEncounterTable ()
{
    table = null;
    $( 'enc-table-status' ).textContent = '未导入，使用默认随机条目';
    notify();
    renderPreview();
}

function renderPreview ()
{
    const el = $( 'enc-table-preview' );
    if ( !el ) return;
    el.innerHTML = '';
    if ( !table ) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    Object.entries( table ).sort( ( a, b ) => +a[ 0 ] - +b[ 0 ] ).forEach( ( [ k, v ] ) =>
    {
        el.appendChild( h( 'div', { class: 'row', style: 'margin-bottom:2px' }, [
            h( 'span', { class: 'out', style: 'min-width:28px;padding:2px 6px;font-size:.8rem' }, k ),
            h( 'span', { class: 'note', style: 'flex:1;min-width:0' }, v ),
        ] ) );
    } );
}