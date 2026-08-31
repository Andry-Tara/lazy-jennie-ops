'use client'

import {
  useRef,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'


type Props = {

  menuItemId: string

  menuName: string

  currentImageUrl:
    string | null

}


export default function MenuPhotoUploader({

  menuItemId,

  menuName,

  currentImageUrl,

}: Props) {

  const router =
    useRouter()


  const supabase =
    createClient()


  const inputRef =
    useRef<HTMLInputElement>(
      null
    )


  const [
    uploading,
    setUploading,
  ] = useState(false)


  const [
    error,
    setError,
  ] = useState('')


  // =====================================================
  // UPLOAD
  // =====================================================

  async function handleFile(

    event:
      React.ChangeEvent<HTMLInputElement>

  ) {

    const file =
      event.target.files?.[0]


    if (!file) {
      return
    }


    setError('')


    // ===================================================
    // TYPE
    // ===================================================

    const allowedTypes =
      [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setError(
        'Gunakan JPG, PNG atau WEBP.'
      )

      return

    }


    // ===================================================
    // MAX 5 MB
    // ===================================================

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      setError(
        'Ukuran foto maksimal 5 MB.'
      )

      return

    }


    setUploading(true)


    let uploadedPath = ''


    try {

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg'


      uploadedPath =
        `${menuItemId}/${crypto.randomUUID()}.${extension}`


      // =================================================
      // STORAGE UPLOAD
      // =================================================

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            'menu-images'
          )
          .upload(
            uploadedPath,
            file,
            {
              cacheControl:
                '3600',

              upsert:
                false,

              contentType:
                file.type,
            }
          )


      if (uploadError) {
        throw uploadError
      }


      // =================================================
      // PUBLIC URL
      // =================================================

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from(
            'menu-images'
          )
          .getPublicUrl(
            uploadedPath
          )


      const imageUrl =
        publicUrlData
          .publicUrl


      // =================================================
      // SAVE TO MENU
      // =================================================

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'set_menu_image',
          {
            p_menu_item_id:
              menuItemId,

            p_image_url:
              imageUrl,
          }
        )


      if (rpcError) {

        // Remove uploaded file
        // if DB update fails.

        await supabase.storage
          .from(
            'menu-images'
          )
          .remove([
            uploadedPath,
          ])


        throw rpcError

      }


      router.refresh()


    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : 'Upload photo failed.'


      setError(
        message
      )

    } finally {

      setUploading(false)


      if (
        inputRef.current
      ) {

        inputRef.current.value =
          ''

      }

    }

  }


  // =====================================================
  // REMOVE IMAGE FROM MENU
  // =====================================================

  async function removeImage() {

    setError('')

    setUploading(true)


    try {

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'set_menu_image',
          {
            p_menu_item_id:
              menuItemId,

            p_image_url:
              null,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      router.refresh()


    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to remove photo.'


      setError(
        message
      )

    } finally {

      setUploading(false)

    }

  }


  return (

    <div>

      {/* PHOTO */}

      <div
        className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
        style={
          currentImageUrl
            ? {
                backgroundImage:
                  `url("${currentImageUrl}")`,
              }
            : undefined
        }
      >

        {!currentImageUrl && (

          <div className="flex h-full items-center justify-center">

            <div className="text-center">

              <div className="text-4xl">
                🍽️
              </div>

              <p className="mt-2 text-xs text-zinc-400">
                No Menu Photo
              </p>

            </div>

          </div>

        )}

      </div>


      {/* FILE INPUT */}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={
          handleFile
        }
        className="hidden"
      />


      {/* ACTION */}

      <div className="mt-3 flex flex-wrap gap-2">

        <button
          type="button"
          disabled={
            uploading
          }
          onClick={() =>
            inputRef.current
              ?.click()
          }
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50"
        >

          {uploading
            ? 'Uploading...'
            : currentImageUrl
              ? 'Change Photo'
              : '+ Upload Photo'}

        </button>


        {currentImageUrl && (

          <button
            type="button"
            disabled={
              uploading
            }
            onClick={
              removeImage
            }
            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >

            Remove

          </button>

        )}

      </div>


      {error && (

        <p className="mt-2 text-xs font-medium text-red-700">

          {error}

        </p>

      )}


      <p className="mt-2 text-[10px] text-zinc-400">

        {menuName} • JPG / PNG / WEBP • Max 5 MB

      </p>

    </div>

  )

}
