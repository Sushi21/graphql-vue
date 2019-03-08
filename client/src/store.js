import Vue from 'vue'
import Vuex from 'vuex'
import router from './router'

import { defaultClient as apolloClient } from './main'
import {
  GET_POSTS,
  SIGNIN_USER,
  GET_CURRENT_USER,
  SIGNUP_USER,
  ADD_POST
} from './queries'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    posts: [],
    user: null,
    loading: false,
    error: null,
    authError: null
  },
  mutations: {
    setPosts: (state, payload) => {
      state.posts = payload
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
          console.log(data.getCurrentUser)
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
          console.log(data.getPosts)
        })
        .catch(err => {
          commit('setLoading', false)
          console.error(err)
        })
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
            console.log(data)

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
          }
        })
        .then(({ data }) => {
          console.log(data.addPost)
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
    }
  },
  getters: {
    posts: state => state.posts,
    loading: state => state.loading,
    user: state => state.user,
    userFavorites: state => state.user && state.user.favorites,
    error: state => state.error,
    authError: state => state.authError
  }
})
