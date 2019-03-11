import Vue from 'vue'
import Vuex from 'vuex'
import router from './router'

import { defaultClient as apolloClient } from './main'
import {
  GET_POSTS,
  SIGNIN_USER,
  GET_CURRENT_USER,
  SIGNUP_USER,
  ADD_POST,
  SEARCH_POSTS,
  GET_USER_POSTS,
  UPDATE_USER_POST,
  DELETE_USER_POST,
  INFINITE_SCROLL_POSTS
} from './queries'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    posts: [],
    userPosts: [],
    searchResults: [],
    user: null,
    loading: false,
    error: null,
    authError: null
  },
  mutations: {
    setPosts: (state, payload) => {
      state.posts = payload
    },
    setUserPosts: (state, payload) => {
      state.userPosts = payload
    },
    setSearchResults: (state, payload) => {
      if (payload !== null) {
        state.searchResults = payload
      }
    },
    setUser: (state, payload) => {
      state.user = payload
    },
    setLoading: (state, payload) => {
      state.loading = payload
    },
    setError: (state, payload) => {
      state.error = payload
    },
    setAuthError: (state, payload) => {
      state.authError = payload
    },
    clearUser: state => (state.user = null),
    clearSearchResults: state => (state.searchResults = []),
    clearError: state => (state.error = null)
  },
  actions: {
    getCurrentUser: ({ commit }) => {
      commit('setLoading', true)
      apolloClient
        .query({
          query: GET_CURRENT_USER
        })
        .then(({ data }) => {
          commit('setLoading', false)
          commit('setUser', data.getCurrentUser)
        })
        .catch(err => {
          console.error(err)
          commit('setLoading', false)
        })
    },
    getPosts: ({ commit }) => {
      //use ApolloClient to fire getPOsts query
      commit('setLoading', true)
      apolloClient
        .query({
          query: GET_POSTS
        })
        .then(({ data }) => {
          //get data from actions to states via mutuations
          // commit passes data from axtions along to mutation functgions
          commit('setPosts', data.getPosts)
          commit('setLoading', false)
        })
        .catch(err => {
          commit('setLoading', false)
          console.error(err)
        })
    },
    getUserPosts: ({ commit }, payload) => {
      apolloClient
        .query({
          query: GET_USER_POSTS,
          variables: payload
        })
        .then(({ data }) => {
          commit('setUserPosts', data.getUserPosts)
        })
        .catch(err => console.error(err))
    },
    searchPosts: ({ commit }, payload) => {
      apolloClient
        .query({
          query: SEARCH_POSTS,
          variables: payload
        })
        .then(({ data }) => {
          commit('setSearchResults', data.searchPosts)
        })
        .catch(err => console.error(err))
    },
    addPost: ({ commit }, payload) => {
      apolloClient
        .mutate({
          mutation: ADD_POST,
          variables: payload,
          update: (cache, { data: { addPost } }) => {
            // First read the query you want to update

            const data = cache.readQuery({ query: GET_POSTS })
            //Create updated data
            data.getPosts.unshift(addPost)

            //write updated data back to the query
            cache.writeQuery({
              query: GET_POSTS,
              data
            })
          },
          optimisticResponse: {
            __typename: 'Mutation',
            addPost: {
              __typename: 'Post',
              _id: -1,
              ...payload
            }
          },
          // rerun scecified queries after perfmiring the mutation
          refetchQueries: [
            {
              query: INFINITE_SCROLL_POSTS,
              variables: {
                pageNum: 1,
                pageSize: 2
              }
            }
          ]
        })
        .then(({ data }) => {
          console.log(data.addPost)
        })
        .catch(err => {
          console.error(err)
        })
    },
    updateUserPost: ({ state, commit }, payload) => {
      apolloClient
        .mutate({
          mutation: UPDATE_USER_POST,
          variables: payload
        })
        .then(({ data }) => {
          const index = state.userPosts.findIndex(
            post => post._id === data.updateUserPost._id
          )

          const userPosts = [
            ...state.userPosts.slice(0, index),
            data.updateUserPost,
            ...state.userPosts.slice(index + 1)
          ]

          commit('setUserPosts', userPosts)
        })
        .catch(err => {
          console.error(err)
        })
    },
    signinUser: ({ commit }, payload) => {
      commit('setLoading', true)
      commit('clearError')

      apolloClient
        .mutate({
          mutation: SIGNIN_USER,
          variables: payload
        })
        .then(({ data }) => {
          commit('setLoading', false)
          localStorage.setItem('token', data.signinUser.token)
          // to make sure created method is run in main.js
          //reload the page
          router.go()
        })
        .catch(err => {
          commit('setLoading', false)
          commit('setError', err)
          console.error(err)
        })
    },
    signupUser: ({ commit }, payload) => {
      commit('setLoading', true)
      commit('clearError')

      apolloClient
        .mutate({
          mutation: SIGNUP_USER,
          variables: payload
        })
        .then(({ data }) => {
          commit('setLoading', false)
          localStorage.setItem('token', data.signupUser.token)
          // to make sure created method is run in main.js
          //reload the page
          router.go()
        })
        .catch(err => {
          commit('setLoading', false)
          commit('setError', err)
          console.error(err)
        })
    },
    signoutUser: async ({ commit }) => {
      // clear user in state
      commit('clearUser')
      // remove token on localStorage
      localStorage.setItem('token', '')
      //end session
      await apolloClient.resetStore()
      // redirect home
      router.push('/')
    },
    deleteUserPost: async ({ state, commit }, payload) => {
      apolloClient
        .mutate({
          mutation: DELETE_USER_POST,
          variables: payload
        })
        .then(({ data }) => {
          const index = state.userPosts.findIndex(
            post => post._id === data.deleteUserPost._id
          )

          const userPosts = [
            ...state.userPosts.slice(0, index),
            ...state.userPosts.slice(index + 1)
          ]

          commit('setUserPosts', userPosts)
        })
        .catch(err => {
          console.error(err)
        })
    }
  },
  getters: {
    posts: state => state.posts,
    userPosts: state => state.userPosts,
    searchResults: state => state.searchResults,
    loading: state => state.loading,
    user: state => state.user,
    userFavorites: state => state.user && state.user.favorites,
    error: state => state.error,
    authError: state => state.authError
  }
})
